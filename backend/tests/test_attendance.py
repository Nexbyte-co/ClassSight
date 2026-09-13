import io
from datetime import date
from unittest.mock import patch

from tests.conftest import auth_headers


def _create_session(client, headers, classroom_id, session_date="2026-01-15"):
    response = client.post(
        "/attendance/session",
        json={"classroom_id": classroom_id, "session_date": session_date},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_teacher_can_create_session_for_own_classroom(client, teacher_user, classroom):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    body = _create_session(client, headers, classroom.id)
    assert body["classroom_id"] == classroom.id
    assert body["photo_url"] is None


def test_other_teacher_cannot_create_session(client, classroom, other_teacher_user):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = client.post(
        "/attendance/session",
        json={"classroom_id": classroom.id, "session_date": "2026-01-15"},
        headers=headers,
    )
    assert response.status_code == 403


def test_duplicate_session_date_rejected(client, teacher_user, classroom):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    _create_session(client, headers, classroom.id)
    response = client.post(
        "/attendance/session",
        json={"classroom_id": classroom.id, "session_date": "2026-01-15"},
        headers=headers,
    )
    assert response.status_code == 409


def test_upload_process_confirm_flow(client, teacher_user, classroom, student):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    session = _create_session(client, headers, classroom.id)
    session_id = session["id"]

    with patch(
        "app.services.s3_service.upload_session_photo",
        return_value="https://bucket.s3.amazonaws.com/fake.jpg",
    ):
        upload = client.post(
            f"/attendance/upload?session_id={session_id}",
            files={"file": ("photo.jpg", io.BytesIO(b"fake-bytes"), "image/jpeg")},
            headers=headers,
        )
    assert upload.status_code == 200, upload.text
    assert upload.json()["photo_url"].startswith("https://")

    process = client.post(f"/attendance/process?session_id={session_id}", headers=headers)
    assert process.status_code == 200, process.text
    assert process.json()["unrecognized_face_count"] == 0

    confirm = client.post(
        f"/attendance/confirm?session_id={session_id}",
        json={"records": [{"student_id": student.id, "status": "present"}]},
        headers=headers,
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()[0]["status"] == "present"

    logs = client.get(f"/attendance/logs?classroom_id={classroom.id}", headers=headers)
    assert logs.status_code == 200
    assert len(logs.json()) == 1
    assert len(logs.json()[0]["records"]) == 1

    analytics = client.get(
        f"/attendance/analytics?classroom_id={classroom.id}", headers=headers
    )
    assert analytics.status_code == 200
    body = analytics.json()
    assert body["present_count"] == 1
    assert body["average_attendance_rate"] == 1.0


def test_process_requires_uploaded_photo(client, teacher_user, classroom):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    session = _create_session(client, headers, classroom.id)
    response = client.post(
        f"/attendance/process?session_id={session['id']}", headers=headers
    )
    assert response.status_code == 422


def test_confirm_rejects_student_outside_classroom(
    client, teacher_user, classroom, db_session
):
    from app.models import Classroom, Student

    other_room = Classroom(course="CS102", section="B", teacher_id=teacher_user.id)
    db_session.add(other_room)
    db_session.commit()
    other_student = Student(roll_number="X1", name="Eve", classroom_id=other_room.id)
    db_session.add(other_student)
    db_session.commit()
    db_session.refresh(other_student)

    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    session = _create_session(client, headers, classroom.id)

    response = client.post(
        f"/attendance/confirm?session_id={session['id']}",
        json={"records": [{"student_id": other_student.id, "status": "present"}]},
        headers=headers,
    )
    assert response.status_code == 422


def test_other_teacher_cannot_view_logs(client, classroom, other_teacher_user):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = client.get(f"/attendance/logs?classroom_id={classroom.id}", headers=headers)
    assert response.status_code == 403
