import io
from unittest.mock import patch

import numpy as np
import pytest

from app.models import Student
from app.services import face_recognition
from tests.conftest import auth_headers

TEACHER = ("teacher1@classsight.example", "teacherpass123")


def _unit(index):
    return np.eye(1, face_recognition.EMBEDDING_DIM, index, dtype=np.float32)[0]


@pytest.fixture
def enrolled(db_session, classroom, student):
    """Alice (fixture student) and Bob enrolled; Carol in the class but not enrolled."""
    student.face_embedding = face_recognition.embedding_to_bytes(_unit(0))
    bob = Student(
        roll_number="R002",
        name="Bob",
        classroom_id=classroom.id,
        face_embedding=face_recognition.embedding_to_bytes(_unit(1)),
    )
    carol = Student(roll_number="R003", name="Carol", classroom_id=classroom.id)
    db_session.add_all([bob, carol])
    db_session.commit()
    return {"alice": student, "bob": bob, "carol": carol}


def _verify(client, classroom, faces, headers=None):
    headers = headers or auth_headers(client, *TEACHER)
    with patch.object(face_recognition, "extract_face_embeddings", return_value=faces):
        return client.post(
            f"/classrooms/{classroom.id}/verify",
            files={"file": ("capture.jpg", io.BytesIO(b"img"), "image/jpeg")},
            headers=headers,
        )


def test_enrolled_student_is_verified(client, teacher_user, classroom, enrolled):
    response = _verify(client, classroom, np.stack([_unit(1)]))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verified"] is True
    assert body["reason"] == "matched"
    assert body["student"] == {"id": enrolled["bob"].id, "roll_number": "R002", "name": "Bob"}
    assert body["confidence"] > 0.99


def test_stranger_is_not_verified(client, teacher_user, classroom, enrolled):
    body = _verify(client, classroom, np.stack([_unit(7)])).json()
    assert body["verified"] is False
    assert body["student"] is None
    assert body["reason"] == "below_threshold"


def test_face_between_two_students_is_ambiguous(client, teacher_user, classroom, enrolled):
    between = face_recognition._normalize(_unit(0) + _unit(1))
    body = _verify(client, classroom, np.stack([between])).json()
    assert body["verified"] is False
    assert body["student"] is None
    assert body["reason"] == "ambiguous"


@pytest.mark.parametrize("face_count", [0, 2])
def test_photo_must_contain_exactly_one_face(
    client, teacher_user, classroom, enrolled, face_count
):
    faces = np.stack([_unit(i) for i in range(face_count)]) if face_count else np.empty(
        (0, face_recognition.EMBEDDING_DIM), dtype=np.float32
    )
    response = _verify(client, classroom, faces)
    assert response.status_code == 422
    assert "exactly one face" in response.json()["detail"]


def test_no_enrolled_students_skips_model(client, teacher_user, classroom, student):
    with patch.object(face_recognition, "extract_face_embeddings") as extract:
        response = client.post(
            f"/classrooms/{classroom.id}/verify",
            files={"file": ("capture.jpg", io.BytesIO(b"img"), "image/jpeg")},
            headers=auth_headers(client, *TEACHER),
        )
    assert response.status_code == 200
    assert response.json()["reason"] == "no_enrolled_students"
    extract.assert_not_called()


def test_undecodable_photo_returns_422(client, teacher_user, classroom, enrolled):
    response = client.post(
        f"/classrooms/{classroom.id}/verify",
        files={"file": ("capture.jpg", io.BytesIO(b"not an image"), "image/jpeg")},
        headers=auth_headers(client, *TEACHER),
    )
    assert response.status_code == 422
    assert "decode" in response.json()["detail"]


def test_wrong_file_type_rejected(client, teacher_user, classroom, enrolled):
    response = client.post(
        f"/classrooms/{classroom.id}/verify",
        files={"file": ("capture.gif", io.BytesIO(b"x"), "image/gif")},
        headers=auth_headers(client, *TEACHER),
    )
    assert response.status_code == 422


def test_only_students_of_this_classroom_are_candidates(
    client, teacher_user, classroom, enrolled, db_session
):
    from app.models import Classroom

    other_room = Classroom(course="CS102", section="B", teacher_id=teacher_user.id)
    db_session.add(other_room)
    db_session.commit()
    db_session.add(
        Student(
            roll_number="X1",
            name="Eve",
            classroom_id=other_room.id,
            face_embedding=face_recognition.embedding_to_bytes(_unit(9)),
        )
    )
    db_session.commit()

    body = _verify(client, classroom, np.stack([_unit(9)])).json()
    assert body["verified"] is False


def test_other_teacher_cannot_verify(client, classroom, enrolled, other_teacher_user):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = _verify(client, classroom, np.stack([_unit(0)]), headers=headers)
    assert response.status_code == 403
