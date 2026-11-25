from datetime import date, time

from app.models import AttendanceRecord, AttendanceSession, AttendanceStatus, Lecture
from tests.conftest import auth_headers, make_classroom

ADMIN = ("admin@classsight.example", "adminpass123")
TEACHER = ("teacher1@classsight.example", "teacherpass123")


def _add_student(client, section_id, roll, email, password="studentpass1"):
    response = client.post(
        f"/sections/{section_id}/students",
        json={"roll_number": roll, "name": f"S {roll}", "email": email, "password": password},
        headers=auth_headers(client, *ADMIN),
    )
    assert response.status_code == 201, response.text
    return response.json()


def _login(client, email, password):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_student_can_sign_in_with_the_email_and_password_the_admin_set(
    client, admin_user, teacher_user, db_session
):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    _add_student(client, room.section_id, "R1", "Kid@College.edu")

    ok = _login(client, "kid@college.edu", "studentpass1")
    assert ok.status_code == 200, ok.text
    assert ok.json()["role"] == "student"
    headers = {"Authorization": f"Bearer {ok.json()['access_token']}"}
    me = client.get("/student/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["roll_number"] == "R1" and me.json()["section_name"] == "A"

    assert _login(client, "kid@college.edu", "wrong-password").status_code == 401
    assert _login(client, "nobody@college.edu", "studentpass1").status_code == 401


def test_student_without_a_password_cannot_sign_in(client, admin_user, teacher_user, db_session):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    client.post(
        f"/sections/{room.section_id}/students",
        json={"roll_number": "R2", "name": "No Pass", "email": "nopass@college.edu"},
        headers=auth_headers(client, *ADMIN),
    )
    assert _login(client, "nopass@college.edu", "").status_code == 401


def test_student_token_is_useless_on_staff_routes_and_staff_token_on_student_routes(
    client, admin_user, teacher_user, db_session
):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    _add_student(client, room.section_id, "R1", "kid@college.edu")
    token = _login(client, "kid@college.edu", "studentpass1").json()["access_token"]
    student = {"Authorization": f"Bearer {token}"}

    assert client.get("/auth/me", headers=student).status_code == 401
    assert client.get("/users", headers=student).status_code == 401
    assert client.get("/classrooms", headers=student).status_code == 401
    assert client.get("/sections", headers=student).status_code == 401

    teacher = auth_headers(client, *TEACHER)
    assert client.get("/student/me", headers=teacher).status_code == 401
    assert client.get("/student/overview", headers=teacher).status_code == 401
    assert client.get("/student/me").status_code == 401


def test_overview_has_only_my_batch_and_my_own_records(client, admin_user, teacher_user, db_session):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id, course_code="UCS1")
    other_batch = make_classroom(db_session, "CS999", "B", teacher_user.id)
    me = _add_student(client, room.section_id, "R1", "me@college.edu")
    mate = _add_student(client, room.section_id, "R2", "mate@college.edu")

    db_session.add(Lecture(classroom_id=room.id, weekday=0, start_time=time(9), end_time=time(10), room="LP1"))
    session = AttendanceSession(classroom_id=room.id, session_date=date(2026, 11, 2))
    db_session.add(session)
    db_session.flush()
    db_session.add_all(
        [
            AttendanceRecord(session_id=session.id, student_id=me["id"], status=AttendanceStatus.PRESENT),
            AttendanceRecord(session_id=session.id, student_id=mate["id"], status=AttendanceStatus.ABSENT),
        ]
    )
    db_session.commit()

    token = _login(client, "me@college.edu", "studentpass1").json()["access_token"]
    data = client.get("/student/overview", headers={"Authorization": f"Bearer {token}"}).json()

    assert [c["course"] for c in data["classes"]] == ["CS101"]  # not the other batch's class
    assert data["classes"][0]["teacher_name"] == teacher_user.name
    assert data["classes"][0]["lectures"][0]["room"] == "LP1"
    assert data["records"] == [
        {"classroom_id": room.id, "session_date": "2026-11-02", "status": "present"}
    ]
    assert other_batch.id not in [c["id"] for c in data["classes"]]


def test_student_email_cannot_clash_with_a_staff_account(client, admin_user, teacher_user, db_session):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    clash = client.post(
        f"/sections/{room.section_id}/students",
        json={"roll_number": "R3", "name": "X", "email": TEACHER[0], "password": "studentpass1"},
        headers=auth_headers(client, *ADMIN),
    )
    assert clash.status_code == 409

    _add_student(client, room.section_id, "R4", "taken@college.edu")
    teacher_dup = client.post(
        "/users",
        json={"name": "T", "email": "taken@college.edu", "password": "longenough1", "role": "teacher"},
        headers=auth_headers(client, *ADMIN),
    )
    assert teacher_dup.status_code == 409


def test_removing_a_students_password_locks_out_their_old_token(client, admin_user, teacher_user, db_session):
    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    kid = _add_student(client, room.section_id, "R1", "kid@college.edu")
    token = _login(client, "kid@college.edu", "studentpass1").json()["access_token"]
    client.delete(
        f"/sections/{room.section_id}/students/{kid['id']}", headers=auth_headers(client, *ADMIN)
    )
    assert client.get("/student/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_student_sees_their_own_enrolled_photo_as_an_avatar(client, admin_user, teacher_user, db_session, fake_s3):
    import io
    from unittest.mock import patch

    import numpy as np

    from app.services import face_recognition

    room = make_classroom(db_session, "CS101", "A", teacher_user.id)
    made = _add_student(client, room.section_id, "R1", "kid@college.edu")
    token = _login(client, "kid@college.edu", "studentpass1").json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/student/me/photo", headers=headers).status_code == 404  # nothing enrolled yet
    assert client.get("/student/me", headers=headers).json()["face_enrolled"] is False

    face = np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)
    with patch.object(face_recognition, "extract_main_face", lambda _b: face):
        client.post(
            f"/sections/{room.section_id}/students/{made['id']}/face",
            files=[("files", ("p.jpg", io.BytesIO(b"first-photo"), "image/jpeg"))],
            headers=auth_headers(client, *ADMIN),
        )
    shown = client.get("/student/me/photo", headers=headers)
    assert shown.status_code == 200 and shown.headers["content-type"] == "image/jpeg"
    assert shown.content == b"first-photo"
    assert client.get("/student/me", headers=headers).json()["face_enrolled"] is True
    assert client.get("/student/me/photo", headers=auth_headers(client, *TEACHER)).status_code == 401  # staff token
