import io
from unittest.mock import patch

import numpy as np

from app.models import Section, Student
from app.services import face_recognition
from tests.conftest import auth_headers, make_classroom

TEACHER = ("teacher1@classsight.example", "teacherpass123")
OTHER = ("teacher2@classsight.example", "teacherpass123")
ADMIN = ("admin@classsight.example", "adminpass123")


def _students(client, classroom, headers):
    response = client.get(f"/classrooms/{classroom.id}/students", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_student_added_in_one_class_appears_in_every_class_of_the_section(
    client, admin_user, db_session, teacher_user, other_teacher_user, classroom
):
    # Same section "A", different course and a different teacher.
    sibling = make_classroom(db_session, "Maths", "A", other_teacher_user.id)
    assert sibling.section_id == classroom.section_id

    mine = auth_headers(client, *TEACHER)
    created = client.post(
        f"/sections/{classroom.section_id}/students",
        json={"roll_number": "S1", "name": "Asha"},
        headers=auth_headers(client, *ADMIN),
    )
    assert created.status_code == 201, created.text
    assert created.json()["section_id"] == classroom.section_id

    theirs = auth_headers(client, *OTHER)
    assert [s["roll_number"] for s in _students(client, sibling, theirs)] == ["S1"]
    assert [s["roll_number"] for s in _students(client, classroom, mine)] == ["S1"]


def test_students_of_another_section_are_not_visible(
    client, db_session, teacher_user, classroom, student
):
    other_section = make_classroom(db_session, "CS101", "B", teacher_user.id)
    headers = auth_headers(client, *TEACHER)
    assert _students(client, other_section, headers) == []
    assert len(_students(client, classroom, headers)) == 1


def test_section_name_is_unique_ignoring_case(client, admin_user, teacher_user, db_session):
    headers = auth_headers(client, *ADMIN)

    def create(course, section):
        return client.post(
            "/classrooms",
            json={"course": course, "section": section, "teacher_id": teacher_user.id},
            headers=headers,
        )

    first = create("Networks", "3C2")
    second = create("Databases", "  3c2 ")
    assert first.status_code == 201 and second.status_code == 201
    assert db_session.query(Section).count() == 1
    assert second.json()["section"] == "3C2"  # the first spelling is kept

    assert create("networks", "3c2").status_code == 409  # same course and section, any case
    assert create("Networks", "3C2").status_code == 409

def test_teacher_cannot_join_a_section_they_do_not_teach(
    client, db_session, teacher_user, other_teacher_user, classroom, student
):
    theirs = auth_headers(client, *OTHER)

    def create(headers, teacher, course, section):
        return client.post(
            "/classrooms",
            json={"course": course, "section": section, "teacher_id": teacher.id},
            headers=headers,
        )

    # Section "A" has a class and a student that belong to the first teacher.
    blocked = create(theirs, other_teacher_user, "Spy", "a")
    assert blocked.status_code == 403
    assert db_session.query(Section).count() == 1

    # A brand-new section is fine, and so is another class in a section they already teach.
    assert create(theirs, other_teacher_user, "Maths", "Z").status_code == 201
    assert create(theirs, other_teacher_user, "Physics", "z").status_code == 201


def test_admin_can_attach_a_class_to_an_existing_section(
    client, db_session, admin_user, other_teacher_user, classroom, student
):
    admin = auth_headers(client, *ADMIN)
    response = client.post(
        "/classrooms",
        json={"course": "Maths", "section": "A", "teacher_id": other_teacher_user.id},
        headers=admin,
    )
    assert response.status_code == 201, response.text
    theirs = auth_headers(client, *OTHER)
    assert len(_students(client, db_session.get(type(classroom), response.json()["id"]), theirs)) == 1


def test_blank_section_means_no_batch_yet_for_admins_and_is_rejected_for_teachers(
    client, admin_user, teacher_user
):
    body = {"course": "Networks", "section": "   ", "teacher_id": teacher_user.id}
    teacher = client.post("/classrooms", json=body, headers=auth_headers(client, *TEACHER))
    assert teacher.status_code == 422
    admin = client.post("/classrooms", json=body, headers=auth_headers(client, *ADMIN))
    assert admin.status_code == 201 and admin.json()["section"] == ""


def test_face_enrolled_once_is_recognised_in_every_class_of_the_section(
    client, admin_user, db_session, teacher_user, other_teacher_user, classroom, student, fake_s3
):
    sibling = make_classroom(db_session, "Maths", "A", other_teacher_user.id)
    face = np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)
    mine = auth_headers(client, *ADMIN)

    with patch.object(face_recognition, "extract_main_face", lambda _b: face):
        enrolled = client.post(
            f"/sections/{student.section_id}/students/{student.id}/face",
            files=[("files", ("p.jpg", io.BytesIO(b"img"), "image/jpeg"))],
            headers=mine,
        )
    assert enrolled.status_code == 200, enrolled.text

    theirs = auth_headers(client, *OTHER)
    with patch.object(face_recognition, "extract_main_face", lambda _b: face):
        verified = client.post(
            f"/classrooms/{sibling.id}/verify",
            files={"file": ("c.jpg", io.BytesIO(b"img"), "image/jpeg")},
            headers=theirs,
        )
    assert verified.status_code == 200, verified.text
    body = verified.json()
    assert body["verified"] is True and body["student"]["id"] == student.id


def test_attendance_in_a_sibling_class_uses_the_section_roster(
    client, db_session, teacher_user, other_teacher_user, classroom, student
):
    sibling = make_classroom(db_session, "Maths", "A", other_teacher_user.id)
    theirs = auth_headers(client, *OTHER)
    session = client.post(
        "/attendance/session",
        json={"classroom_id": sibling.id, "session_date": "2026-02-02"},
        headers=theirs,
    ).json()
    confirmed = client.post(
        f"/attendance/confirm?session_id={session['id']}",
        json={"records": [{"student_id": student.id, "status": "present"}]},
        headers=theirs,
    )
    assert confirmed.status_code == 200, confirmed.text

    roster = client.get(f"/classrooms/{sibling.id}/students", headers=theirs).json()
    assert [s["id"] for s in roster] == [student.id]


def test_attendance_cannot_record_a_student_from_another_section(
    client, db_session, teacher_user, classroom, student
):
    other_section = make_classroom(db_session, "CS101", "B", teacher_user.id)
    headers = auth_headers(client, *TEACHER)
    session = client.post(
        "/attendance/session",
        json={"classroom_id": other_section.id, "session_date": "2026-02-02"},
        headers=headers,
    ).json()
    rejected = client.post(
        f"/attendance/confirm?session_id={session['id']}",
        json={"records": [{"student_id": student.id, "status": "present"}]},
        headers=headers,
    )
    assert rejected.status_code == 422


def test_roll_numbers_stay_unique_across_sections(client, admin_user, db_session, teacher_user, classroom, student):
    other_section = make_classroom(db_session, "CS101", "B", teacher_user.id)
    headers = auth_headers(client, *ADMIN)
    duplicate = client.post(
        f"/sections/{other_section.section_id}/students",
        json={"roll_number": student.roll_number, "name": "Copy"},
        headers=headers,
    )
    assert duplicate.status_code == 409
    assert db_session.query(Student).count() == 1


def test_admin_section_crud_and_counts(client, admin_user, db_session, teacher_user, classroom, student):
    admin = auth_headers(client, *ADMIN)
    made = client.post("/sections", json={"name": "  b1 "}, headers=admin)
    assert made.status_code == 201, made.text
    assert made.json()["name"] == "b1" and made.json()["student_count"] == 0
    assert client.post("/sections", json={"name": "B1"}, headers=admin).status_code == 409
    assert client.post("/sections", json={"name": "   "}, headers=admin).status_code == 422
    assert client.post("/sections", json={"name": "x" * 41}, headers=admin).status_code == 422

    listing = client.get("/sections", headers=admin).json()
    assert [(s["name"], s["student_count"]) for s in listing] == [("A", 1), ("b1", 0)]

    sid = made.json()["id"]
    added = client.post(
        f"/sections/{sid}/students", json={"roll_number": "N1", "name": "Neo"}, headers=admin
    )
    assert added.status_code == 201 and added.json()["section_id"] == sid
    counts = {s["name"]: s["student_count"] for s in client.get("/sections", headers=admin).json()}
    assert counts == {"A": 1, "b1": 1}
    roster = client.get(f"/sections/{sid}/students", headers=admin).json()
    assert [r["roll_number"] for r in roster] == ["N1"]
    assert client.get("/sections/99999/students", headers=admin).status_code == 404
    assert client.post("/sections/99999/students", json={"roll_number": "Q", "name": "Q"}, headers=admin).status_code == 404

    # visible only in classes of its own section
    mine = make_classroom(db_session, "Maths", "b1", teacher_user.id)
    teacher = auth_headers(client, *TEACHER)
    assert [s["roll_number"] for s in _students(client, mine, teacher)] == ["N1"]
    assert [s["roll_number"] for s in _students(client, classroom, teacher)] == ["R001"]


def test_teacher_and_anonymous_are_refused_on_every_section_endpoint(
    client, teacher_user, classroom, student
):
    teacher = auth_headers(client, *TEACHER)
    sid, stid = student.section_id, student.id
    calls = [
        ("get", "/sections", {}),
        ("post", "/sections", {"json": {"name": "Z"}}),
        ("get", f"/sections/{sid}/students", {}),
        ("post", f"/sections/{sid}/students", {"json": {"roll_number": "Q", "name": "Q"}}),
        ("get", f"/sections/{sid}/students/{stid}", {}),
        ("post", f"/sections/{sid}/students/{stid}/face", {}),
        ("delete", f"/sections/{sid}/students/{stid}/face", {}),
    ]
    for method, url, kwargs in calls:
        assert getattr(client, method)(url, headers=teacher, **kwargs).status_code == 403, url
        assert getattr(client, method)(url, **kwargs).status_code == 401, url


def test_admin_can_create_edit_and_delete_a_student_with_email(client, admin_user, teacher_user, db_session):
    classroom = make_classroom(db_session, "CS101", "A", teacher_user.id)
    other = make_classroom(db_session, "CS102", "B", teacher_user.id)
    headers = auth_headers(client, *ADMIN)
    base = f"/sections/{classroom.section_id}/students"

    created = client.post(
        base,
        json={"roll_number": "R1", "name": "Asha", "email": "Asha@College.edu", "password": "longpass123"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    sid = created.json()["id"]
    assert created.json()["email"] == "asha@college.edu"
    assert "password" not in created.text

    dup = client.post(base, json={"roll_number": "R2", "name": "B", "email": "asha@college.edu"}, headers=headers)
    assert dup.status_code == 409

    edited = client.patch(
        f"{base}/{sid}",
        json={"name": "Asha K", "section_id": other.section_id},
        headers=headers,
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["name"] == "Asha K" and edited.json()["section_id"] == other.section_id

    moved = f"/sections/{other.section_id}/students/{sid}"
    assert client.delete(moved, headers=headers).status_code == 204
    assert client.get(moved, headers=headers).status_code == 404


def test_rename_and_delete_section(client, admin_user, teacher_user, db_session):
    classroom = make_classroom(db_session, "CS101", "A", teacher_user.id)
    empty = Section(name="Z9")
    db_session.add(empty)
    db_session.commit()
    headers = auth_headers(client, *ADMIN)

    assert client.patch(f"/sections/{empty.id}", json={"name": "a"}, headers=headers).status_code == 409
    assert client.patch(f"/sections/{empty.id}", json={"name": "Y8"}, headers=headers).json()["name"] == "Y8"
    assert client.delete(f"/sections/{classroom.section_id}", headers=headers).status_code == 409
    assert client.delete(f"/sections/{empty.id}", headers=headers).status_code == 204
    teacher = auth_headers(client, *TEACHER)
    assert client.delete(f"/sections/{classroom.section_id}", headers=teacher).status_code == 403


def test_batch_has_a_degree_programme_and_years(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    first = today.year if today.month >= 7 else today.year - 1  # a batch starting this academic year is in year 1
    made = client.post(
        "/sections",
        json={"name": "1A1", "degree_programme": "be cse (tiet ug)", "start_year": first, "end_year": first + 4},
        headers=admin,
    )
    assert made.status_code == 201, made.text
    assert made.json()["degree_programme"] == "BE CSE (TIET UG)"
    assert (made.json()["start_year"], made.json()["end_year"]) == (first, first + 4)
    listed = [s for s in client.get("/sections", headers=admin).json() if s["name"] == "1A1"][0]
    assert listed["degree_programme"] == "BE CSE (TIET UG)" and listed["end_year"] == first + 4

    bad = lambda **k: client.post("/sections", json={"name": "X1", **k}, headers=admin).status_code  # noqa: E731
    assert bad(degree_programme="Basket Weaving") == 422
    assert bad(start_year=first) == 422  # only one of the two years
    assert bad(start_year=first + 4, end_year=first) == 422
    assert bad(start_year=first, end_year=first + 15) == 422

    edited = client.patch(
        f"/sections/{made.json()['id']}",
        json={"name": "1MCA1", "degree_programme": "MCA (TIET PG)", "start_year": first, "end_year": first + 2},
        headers=admin,
    )
    assert edited.json()["degree_programme"] == "MCA (TIET PG)" and edited.json()["end_year"] == first + 2


def test_batch_name_starts_with_its_year_of_study(client, admin_user):
    from datetime import date

    from app.api.sections import year_of_study

    # the academic year runs July to June
    assert year_of_study(2024, date(2026, 7, 1)) == 3
    assert year_of_study(2024, date(2026, 12, 31)) == 3
    assert year_of_study(2024, date(2027, 1, 1)) == 3
    assert year_of_study(2024, date(2027, 6, 30)) == 3
    assert year_of_study(2024, date(2027, 7, 1)) == 4
    assert year_of_study(2026, date(2026, 11, 18)) == 1
    assert year_of_study(2024, date(2025, 6, 30)) == 1

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    start = today.year - 2 if today.month >= 7 else today.year - 3  # a batch now in its 3rd year
    ok = client.post("/sections", json={"name": "3C23", "start_year": start, "end_year": start + 4}, headers=admin)
    assert ok.status_code == 201, ok.text
    wrong = client.post("/sections", json={"name": "1C23", "start_year": start, "end_year": start + 4}, headers=admin)
    assert wrong.status_code == 422 and "3" in wrong.json()["detail"]
    future = client.post("/sections", json={"name": "1C99", "start_year": today.year + 2, "end_year": today.year + 6}, headers=admin)
    assert future.status_code == 422


def test_only_programmes_with_a_batch_letter_are_offered(client, admin_user):
    admin = auth_headers(client, *ADMIN)
    listed = client.get("/degree-programmes", headers=admin).json()
    codes = client.get("/degree-programmes/codes", headers=admin).json()
    assert list(codes) == listed and len(listed) == 19
    assert codes["BE Computer Engineering (TIET UG)"] == "C" and codes["BE CSE (TIET UG)"] == "Q"
    assert codes["BE CSBS (TIET UG)"] == "R" and codes["MCA (TIET PG)"] == "MCA" and codes["BE Civil (TIET UG)"] == "B"
    assert sorted(v for v in codes.values() if v != "MCA") == sorted("ABCEFGHIJOPQRSUVWX")
    for gone in ("BE AI & ML (TIET UG)", "BE Production (TIET UG)", "BA (TSLAS UG)", "MBA (TIET PG)", "BE Electrical (TIET UG)"):
        assert gone not in listed
        assert client.post("/sections", json={"name": "ZZ1", "degree_programme": gone}, headers=admin).status_code == 422


def test_batch_name_starts_with_year_digit_and_programme_letter(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    this_year = today.year if today.month >= 7 else today.year - 1
    second = this_year - 1  # a batch now in year 2
    body = {"start_year": second, "end_year": second + 4}
    ok = client.post("/sections", json={**body, "name": "2C23", "degree_programme": "BE Computer Engineering (TIET UG)"}, headers=admin)
    assert ok.status_code == 201, ok.text
    wrong = client.post("/sections", json={**body, "name": "2Q23", "degree_programme": "BE Computer Engineering (TIET UG)"}, headers=admin)
    assert wrong.status_code == 422 and "2C" in wrong.json()["detail"]
    mca = client.post("/sections", json={"start_year": second, "end_year": second + 2, "name": "2MCA2", "degree_programme": "MCA (TIET PG)"}, headers=admin)
    assert mca.status_code == 201, mca.text
    assert client.post("/sections", json={"start_year": second, "end_year": second + 2, "name": "2M2", "degree_programme": "MCA (TIET PG)"}, headers=admin).status_code == 422


def test_first_year_batches_are_group_a_or_b_except_ai_ds_csbs_and_mca(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    first = today.year if today.month >= 7 else today.year - 1  # year 1

    def make(name, programme):
        length = 2 if programme.startswith("MCA") else 4  # each degree has one fixed length
        years = {"start_year": first, "end_year": first + length}
        return client.post("/sections", json={**years, "name": name, "degree_programme": programme}, headers=admin)

    # common first year: A or B, whatever the programme
    assert make("1A1", "BE Computer Engineering (TIET UG)").status_code == 201
    assert make("1B1", "BE Computer Engineering (TIET UG)").status_code == 201
    assert make("1A2", "BE Mechanical (TIET UG)").status_code == 201
    bad = make("1C2", "BE Computer Engineering (TIET UG)")  # its own letter is not used in year 1
    assert bad.status_code == 422 and "1A or 1B" in bad.json()["detail"]
    assert make("1H1", "BE Mechanical (TIET UG)").status_code == 422
    # AI & DS, CSBS and MCA keep their own letter from year 1
    assert make("1X1", "BE AI & DS (TIET UG)").status_code == 201
    assert make("1R1", "BE CSBS (TIET UG)").status_code == 201
    assert make("1MCA1", "MCA (TIET PG)").status_code == 201
    assert make("1A5", "BE CSBS (TIET UG)").status_code == 422

    rule = client.get("/degree-programmes/first-year", headers=admin).json()
    assert rule["letters"] == ["A", "B"]
    assert rule["own_letter"] == ["BE AI & DS (TIET UG)", "BE CSBS (TIET UG)", "MCA (TIET PG)"]


def test_dera_bassi_programme_is_only_for_third_and_fourth_year_batches(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    label = "3rd Year \u2014 Computer Science and Engineering DeraBassi"
    assert label in client.get("/degree-programmes", headers=admin).json()
    assert client.get("/degree-programmes/year-limits", headers=admin).json() == {label: [3, 4]}

    today = date.today()
    this_year = today.year if today.month >= 7 else today.year - 1
    for years_ago, name, expected in ((0, "1P1", 422), (1, "2P1", 422), (2, "3P1", 201), (3, "4P1", 201)):
        start = this_year - years_ago
        made = client.post(
            "/sections",
            json={"name": name, "degree_programme": label, "start_year": start, "end_year": start + 4},
            headers=admin,
        )
        assert made.status_code == expected, (name, made.text)


def test_a_degree_has_one_fixed_length(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    first = today.year if today.month >= 7 else today.year - 1
    durations = client.get("/degree-programmes/durations", headers=admin).json()
    assert durations["BE CSE (TIET UG)"] == 4 and durations["MCA (TIET PG)"] == 2
    assert len(durations) == 19

    def make(name, programme, years):
        return client.post(
            "/sections",
            json={"name": name, "degree_programme": programme, "start_year": first, "end_year": first + years},
            headers=admin,
        )

    short = make("1A1", "BE CSE (TIET UG)", 2)  # a 4-year degree saved as 2 years
    assert short.status_code == 422 and "4-year" in short.json()["detail"]
    assert make("1A1", "BE CSE (TIET UG)", 3).status_code == 422
    assert make("1A1", "BE CSE (TIET UG)", 5).status_code == 422
    assert make("1MCA1", "MCA (TIET PG)", 4).status_code == 422  # a 2-year degree saved as 4 years
    assert make("1MCA1", "MCA (TIET PG)", 3).status_code == 422
    assert make("1A1", "BE CSE (TIET UG)", 4).status_code == 201
    mca = make("1MCA1", "MCA (TIET PG)", 2)
    assert mca.status_code == 201, mca.text

    # editing is held to the same rule
    bad = client.patch(
        f"/sections/{mca.json()['id']}",
        json={"name": "1MCA1", "degree_programme": "MCA (TIET PG)", "start_year": first, "end_year": first + 4},
        headers=admin,
    )
    assert bad.status_code == 422


def test_editing_a_batch_follows_the_same_name_rules(client, admin_user):
    from datetime import date

    admin = auth_headers(client, *ADMIN)
    today = date.today()
    second = (today.year if today.month >= 7 else today.year - 1) - 1  # year 2
    body = {"start_year": second, "end_year": second + 4}
    made = client.post("/sections", json={**body, "name": "2C1", "degree_programme": "BE Computer Engineering (TIET UG)"}, headers=admin)
    assert made.status_code == 201, made.text
    url = f"/sections/{made.json()['id']}"

    def edit(**fields):
        return client.patch(url, json={**body, "name": "2C1", "degree_programme": "BE Computer Engineering (TIET UG)", **fields}, headers=admin)

    assert edit().status_code == 200  # nothing changed: fine
    assert edit(name="2C9").status_code == 200  # a new name with the right digit and letter
    assert edit(name="2Q9").status_code == 422  # wrong letter for Computer Engineering
    assert edit(name="3C9").status_code == 422  # wrong year digit
    assert edit(name="2P9", degree_programme="3rd Year \u2014 Computer Science and Engineering DeraBassi").status_code == 422  # year 2 is too early for it
    assert edit(name="2Q9", degree_programme="BE CSE (TIET UG)").status_code == 200  # a new programme brings its letter

    # a name left alone is not re-checked, so a batch that moved on to a new year can still change its programme
    old = client.post("/sections", json={"name": "1C5"}, headers=admin).json()
    assert client.patch(f"/sections/{old['id']}", json={"name": "1C5", "degree_programme": "BE Mechanical (TIET UG)"}, headers=admin).status_code == 200


def test_a_degree_that_is_already_over_is_refused(client, admin_user):
    r = client.post(
        "/sections",
        json={"name": "3MCA1", "degree_programme": "MCA (TIET PG)", "start_year": 2020, "end_year": 2022},
        headers=auth_headers(client, *ADMIN),
    )
    assert r.status_code == 422
    assert "already over" in r.text


def test_subbatch_class_only_sees_its_subbatch_while_the_lecture_sees_everyone(
    client, admin_user, db_session, teacher_user, classroom
):
    admin = auth_headers(client, *ADMIN)
    for roll, sub in (("S1", "a"), ("S2", "B"), ("S3", "")):
        r = client.post(
            f"/sections/{classroom.section_id}/students",
            json={"roll_number": roll, "name": roll, "subbatch": sub},
            headers=admin,
        )
        assert r.status_code == 201, r.text
    assert r.json()["subbatch"] == ""

    # A lab for subbatch A shares the course name and batch with the whole-batch lecture.
    lab = client.post(
        "/classrooms",
        json={"course": classroom.course, "section": "A", "teacher_id": teacher_user.id, "lecture_count": 0, "lab_count": 1, "subbatch": "a"},
        headers=admin,
    )
    assert lab.status_code == 201, lab.text
    assert lab.json()["subbatch"] == "A"
    dup = client.post(
        "/classrooms",
        json={"course": classroom.course, "section": "A", "teacher_id": teacher_user.id, "lab_count": 1, "subbatch": "A"},
        headers=admin,
    )
    assert dup.status_code == 409

    teacher = auth_headers(client, *TEACHER)
    lecture_roster = client.get(f"/classrooms/{classroom.id}/students", headers=teacher).json()
    lab_roster = client.get(f"/classrooms/{lab.json()['id']}/students", headers=teacher).json()
    assert {s["roll_number"] for s in lecture_roster} >= {"S1", "S2", "S3"}
    assert [s["roll_number"] for s in lab_roster] == ["S1"]


def test_teacher_can_see_an_enrolled_photo_of_a_student_in_their_class(
    client, admin_user, teacher_user, other_teacher_user, classroom, student, fake_s3
):
    mine = auth_headers(client, *TEACHER)
    url = f"/classrooms/{classroom.id}/students/{student.id}/photo"
    assert client.get(url, headers=mine).status_code == 404  # nothing enrolled yet

    face = np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)
    with patch.object(face_recognition, "extract_main_face", lambda _b: face):
        client.post(
            f"/sections/{student.section_id}/students/{student.id}/face",
            files=[("files", ("p.jpg", io.BytesIO(b"img"), "image/jpeg"))],
            headers=auth_headers(client, *ADMIN),
        )
    shown = client.get(url, headers=mine)
    assert shown.status_code == 200 and shown.json()["url"]
    assert client.get(url, headers=auth_headers(client, *OTHER)).status_code == 403  # not their class


def test_a_subbatch_is_linked_to_its_batch_and_its_students_attend_the_batch_classes(
    client, admin_user, teacher_user, db_session
):
    admin = auth_headers(client, *ADMIN)
    mine = auth_headers(client, *TEACHER)
    batch = client.post("/sections", json={"name": "ZZ2"}, headers=admin).json()
    sub = client.post("/sections", json={"name": "ZZ23"}, headers=admin).json()
    assert batch["parent_id"] is None and sub["parent_id"] == batch["id"]

    for sid, roll in ((batch["id"], "S1"), (sub["id"], "S2")):
        made = client.post(f"/sections/{sid}/students", json={"name": roll, "roll_number": roll}, headers=admin)
        assert made.status_code == 201, made.text

    lecture = make_classroom(db_session, "Maths", "ZZ2", teacher_user.id)
    lab = make_classroom(db_session, "Lab", "ZZ23", teacher_user.id)
    names = lambda c: sorted(s["name"] for s in client.get(f"/classrooms/{c.id}/students", headers=mine).json())  # noqa: E731
    assert names(lecture) == ["S1", "S2"]  # the batch's class includes its subbatch
    assert names(lab) == ["S2"]  # the subbatch's own class is only its students

    # Renaming the subbatch out of the batch's name unlinks it.
    renamed = client.patch(f"/sections/{sub['id']}", json={"name": "YY1"}, headers=admin)
    assert renamed.status_code == 200 and renamed.json()["parent_id"] is None
