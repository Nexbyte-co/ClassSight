from tests.conftest import auth_headers, make_classroom


def test_teacher_can_create_own_classroom(client, teacher_user):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    response = client.post(
        "/classrooms",
        json={"course": "CS101", "section": "A", "teacher_id": teacher_user.id},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["course"] == "CS101"


def test_teacher_cannot_create_classroom_for_another_teacher(
    client, teacher_user, other_teacher_user
):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    response = client.post(
        "/classrooms",
        json={"course": "CS101", "section": "A", "teacher_id": other_teacher_user.id},
        headers=headers,
    )
    assert response.status_code == 403


def test_student_cannot_create_classroom(client, db_session):
    from app.core.security import hash_password
    from app.models import User, UserRole

    student_user = User(
        name="Student",
        email="student@classsight.example",
        password_hash=hash_password("studentpass123"),
        role=UserRole.STUDENT,
    )
    db_session.add(student_user)
    db_session.commit()

    headers = auth_headers(client, "student@classsight.example", "studentpass123")
    response = client.post(
        "/classrooms",
        json={"course": "CS101", "section": "A", "teacher_id": student_user.id},
        headers=headers,
    )
    assert response.status_code == 403


def test_teacher_cannot_view_another_teachers_classroom(
    client, classroom, other_teacher_user
):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = client.get(f"/classrooms/{classroom.id}", headers=headers)
    assert response.status_code == 403


def test_duplicate_course_section_is_rejected(client, teacher_user, classroom):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    response = client.post(
        "/classrooms",
        json={"course": "CS101", "section": "A", "teacher_id": teacher_user.id},
        headers=headers,
    )
    assert response.status_code == 409


def test_teacher_lists_students_added_by_admin(client, admin_user, teacher_user, classroom):
    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    create = client.post(
        f"/sections/{classroom.section_id}/students",
        json={"roll_number": "R010", "name": "Bob"},
        headers=admin,
    )
    assert create.status_code == 201, create.text

    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    listing = client.get(f"/classrooms/{classroom.id}/students", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["roll_number"] == "R010"
    assert listing.json()[0]["face_enrolled"] is False


def test_classroom_scoped_student_writes_are_gone(client, teacher_user, classroom, student):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    base = f"/classrooms/{classroom.id}/students"
    assert client.post(base, json={"roll_number": "X", "name": "X"}, headers=headers).status_code == 405
    assert client.get(f"{base}/{student.id}", headers=headers).status_code == 404
    assert client.post(f"{base}/{student.id}/face", headers=headers).status_code == 404
    assert client.delete(f"{base}/{student.id}/face", headers=headers).status_code == 404


def test_classroom_department_must_be_a_known_department(client, teacher_user, db_session):
    from app.models import Department

    db_session.add(Department(name="Department of Mathematics"))
    db_session.commit()
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    body = {"course": "M1", "section": "A", "teacher_id": teacher_user.id}

    unknown = client.post("/classrooms", json={**body, "department": "Made Up"}, headers=headers)
    assert unknown.status_code == 422

    # Matched ignoring case; stored with the department's own spelling.
    ok = client.post(
        "/classrooms", json={**body, "department": "department of mathematics"}, headers=headers
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()["department"] == "Department of Mathematics"


def test_assign_classroom_is_admin_only_and_needs_a_teacher(
    client, admin_user, teacher_user, other_teacher_user, classroom
):
    teacher_headers = auth_headers(client, teacher_user.email, "teacherpass123")
    body = {"teacher_id": other_teacher_user.id}
    assert client.patch(f"/classrooms/{classroom.id}", json=body, headers=teacher_headers).status_code == 403

    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert client.patch(f"/classrooms/{classroom.id}", json={"teacher_id": admin_user.id}, headers=headers).status_code == 422
    assert client.patch(f"/classrooms/{classroom.id}", json={"teacher_id": 9999}, headers=headers).status_code == 422
    assert client.patch("/classrooms/9999", json=body, headers=headers).status_code == 404
    assert client.patch(f"/classrooms/{classroom.id}", json=body, headers=headers).status_code == 200


def test_null_teacher_id_takes_the_class_off_its_teacher(client, admin_user, classroom):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    response = client.patch(f"/classrooms/{classroom.id}", json={"teacher_id": None}, headers=headers)
    assert response.status_code == 200
    assert response.json()["teacher_id"] is None


def test_delete_classroom_is_admin_only_and_keeps_the_batch(client, admin_user, teacher_user, db_session):
    from datetime import date

    from app.models import AttendanceSession, Section, Student

    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    db_session.add(Student(roll_number="D1", name="Kid", section_id=room.section_id))
    db_session.add(AttendanceSession(classroom_id=room.id, session_date=date(2026, 11, 2)))
    db_session.commit()

    teacher = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    assert client.delete(f"/classrooms/{room.id}", headers=teacher).status_code == 403

    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    assert client.delete(f"/classrooms/{room.id}", headers=admin).status_code == 204
    assert client.delete(f"/classrooms/{room.id}", headers=admin).status_code == 404
    assert db_session.query(AttendanceSession).count() == 0  # its saved attendance goes with it
    assert db_session.query(Student).count() == 1  # the batch's students stay
    assert db_session.query(Section).count() == 1


def test_subject_sessions_per_week_default_to_one_lecture_and_can_be_chosen_and_changed(
    client, admin_user, teacher_user, db_session
):
    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    base = {"course": "Networks", "section": "A", "teacher_id": teacher_user.id}
    counts = lambda c: (c["lecture_count"], c["lab_count"], c["tutorial_count"])  # noqa: E731

    plain = client.post("/classrooms", json=base, headers=admin).json()
    assert counts(plain) == (1, 0, 0)

    many = client.post(
        "/classrooms",
        json={**base, "course": "Databases", "lecture_count": 3, "lab_count": 1, "tutorial_count": 2},
        headers=admin,
    ).json()
    assert counts(many) == (3, 1, 2)

    nothing = client.post(
        "/classrooms", json={**base, "course": "Empty", "lecture_count": 0}, headers=admin
    )
    assert nothing.status_code == 422  # at least one session per week
    too_many = client.post(
        "/classrooms", json={**base, "course": "Lots", "lab_count": 99}, headers=admin
    )
    assert too_many.status_code == 422

    lab_only = client.patch(
        f"/classrooms/{plain['id']}", json={"lecture_count": 0, "lab_count": 2}, headers=admin
    )
    assert lab_only.status_code == 200 and counts(lab_only.json()) == (0, 2, 0)
    assert client.patch(
        f"/classrooms/{plain['id']}", json={"lab_count": 0}, headers=admin
    ).status_code == 422  # would leave no sessions at all


def test_subject_category_is_core_or_elective(client, admin_user, teacher_user, db_session):
    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    base = {"course": "Networks", "section": "A", "teacher_id": teacher_user.id}
    core = client.post("/classrooms", json=base, headers=admin).json()
    assert core["category"] == "core"
    elective = client.post("/classrooms", json={**base, "course": "Art", "category": "elective"}, headers=admin)
    assert elective.json()["category"] == "elective"
    assert client.post("/classrooms", json={**base, "course": "X", "category": "both"}, headers=admin).status_code == 422
    changed = client.patch(f"/classrooms/{core['id']}", json={"category": "elective"}, headers=admin)
    assert changed.json()["category"] == "elective"


def test_credits_are_one_per_lecture_and_lab_and_half_per_tutorial(client, admin_user, teacher_user, db_session):
    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    base = {"course": "Networks", "section": "A", "teacher_id": teacher_user.id}
    one = client.post("/classrooms", json=base, headers=admin).json()
    assert one["credits"] == 1.0  # a single lecture
    mixed = client.post(
        "/classrooms",
        json={**base, "course": "DB", "lecture_count": 3, "lab_count": 1, "tutorial_count": 1},
        headers=admin,
    ).json()
    assert mixed["credits"] == 4.5  # 3 * 1 + 1 * 1 + 1 * 0.5
    changed = client.patch(f"/classrooms/{one['id']}", json={"lab_count": 2}, headers=admin).json()
    assert changed["credits"] == 3.0


def test_subject_without_a_batch_degree_programme_and_attaching_a_batch(client, admin_user, teacher_user, db_session):
    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    teacher = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    base = {"course": "Image Processing", "teacher_id": teacher_user.id}

    made = client.post(
        "/classrooms",
        json={**base, "degree_programme": "be cse (tiet ug)"},
        headers=admin,
    )
    assert made.status_code == 201, made.text
    room = made.json()
    assert room["section"] == "" and room["degree_programme"] == "BE CSE (TIET UG)"
    assert client.post("/classrooms", json=base, headers=admin).status_code == 409  # same subject, still no batch
    assert client.post("/classrooms", json={**base, "course": "X", "degree_programme": "Basket Weaving"}, headers=admin).status_code == 422

    # teachers don't see it until it has a batch, and can't create one without a batch
    assert client.get("/classrooms", headers=teacher).json() == []
    assert client.post("/classrooms", json={**base, "course": "Y"}, headers=teacher).status_code == 422

    assert client.patch(f"/classrooms/{room['id']}", json={"section": "Nope"}, headers=admin).status_code == 422
    from app.models import Section

    db_session.add(Section(name="3C1"))
    db_session.commit()
    attached = client.patch(f"/classrooms/{room['id']}", json={"section": "3c1"}, headers=admin).json()
    assert attached["section"] == "3C1"
    assert [c["id"] for c in client.get("/classrooms", headers=teacher).json()] == [room["id"]]
    assert client.get("/degree-programmes", headers=admin).json()[0].startswith("BE ")


def test_subject_can_exist_without_a_teacher_until_an_admin_assigns_one(client, admin_user, teacher_user, db_session):
    from app.models import Department

    admin = auth_headers(client, "admin@classsight.example", "adminpass123")
    teacher = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    made = client.post("/classrooms", json={"course": "Surveying"}, headers=admin)
    assert made.status_code == 201, made.text
    room = made.json()
    assert room["teacher_id"] is None and room["department"] == ""
    # a teacher can't create a class for nobody, and doesn't see a subject that isn't theirs
    assert client.post("/classrooms", json={"course": "Y", "section": "A"}, headers=teacher).status_code == 422
    assert client.get("/classrooms", headers=teacher).json() == []

    db_session.add(Department(name="Department of Civil Engineering"))
    teacher_user.department = "Department of Civil Engineering"
    db_session.commit()
    given = client.patch(f"/classrooms/{room['id']}", json={"teacher_id": teacher_user.id}, headers=admin).json()
    assert given["teacher_id"] == teacher_user.id and given["department"] == "Department of Civil Engineering"
