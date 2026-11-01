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


def test_blank_section_is_rejected(client, admin_user, teacher_user):
    headers = auth_headers(client, *ADMIN)
    response = client.post(
        "/classrooms",
        json={"course": "Networks", "section": "   ", "teacher_id": teacher_user.id},
        headers=headers,
    )
    assert response.status_code == 422


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

    analytics = client.get(f"/attendance/analytics?classroom_id={sibling.id}", headers=theirs).json()
    assert analytics["total_students"] == 1


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
