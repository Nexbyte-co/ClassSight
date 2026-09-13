from tests.conftest import auth_headers


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


def test_teacher_can_add_and_list_students(client, teacher_user, classroom):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    create = client.post(
        f"/classrooms/{classroom.id}/students",
        json={"roll_number": "R010", "name": "Bob"},
        headers=headers,
    )
    assert create.status_code == 201, create.text

    listing = client.get(f"/classrooms/{classroom.id}/students", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["roll_number"] == "R010"
