import io
from unittest.mock import patch

import numpy as np

from app.services import face_recognition
from tests.conftest import auth_headers

TEACHER = ("teacher1@classsight.example", "teacherpass123")


def _photos(count=1):
    return [("files", (f"p{i}.jpg", io.BytesIO(b"img"), "image/jpeg")) for i in range(count)]


def _one_face(_image_bytes):
    return np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)


def _url(classroom, student):
    return f"/classrooms/{classroom.id}/students/{student.id}/face"


def test_enroll_stores_normalised_embedding(client, teacher_user, classroom, student, db_session):
    headers = auth_headers(client, *TEACHER)
    with patch.object(face_recognition, "extract_face_embeddings", _one_face):
        response = client.post(_url(classroom, student), files=_photos(2), headers=headers)

    assert response.status_code == 200, response.text
    assert response.json() == {"student_id": student.id, "photos_used": 2}
    db_session.refresh(student)
    stored = face_recognition.embedding_from_bytes(student.face_embedding)
    assert stored.shape == (face_recognition.EMBEDDING_DIM,)
    assert np.isclose(np.linalg.norm(stored), 1.0, atol=1e-5)


def test_photo_with_no_or_multiple_faces_is_rejected(client, teacher_user, classroom, student):
    headers = auth_headers(client, *TEACHER)
    for face_count in (0, 2):
        faces = np.ones((face_count, face_recognition.EMBEDDING_DIM), dtype=np.float32)
        with patch.object(face_recognition, "extract_face_embeddings", lambda _b, f=faces: f):
            response = client.post(_url(classroom, student), files=_photos(), headers=headers)
        assert response.status_code == 422
        assert "exactly one face" in response.json()["detail"]


def test_photo_count_and_type_validated(client, teacher_user, classroom, student):
    headers = auth_headers(client, *TEACHER)
    too_many = client.post(_url(classroom, student), files=_photos(6), headers=headers)
    assert too_many.status_code == 422

    wrong_type = client.post(
        _url(classroom, student),
        files=[("files", ("a.gif", io.BytesIO(b"x"), "image/gif"))],
        headers=headers,
    )
    assert wrong_type.status_code == 422


def test_other_teacher_cannot_enroll(client, classroom, student, other_teacher_user):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = client.post(_url(classroom, student), files=_photos(), headers=headers)
    assert response.status_code == 403


def test_unknown_student_returns_404(client, teacher_user, classroom, student):
    headers = auth_headers(client, *TEACHER)
    response = client.post(
        f"/classrooms/{classroom.id}/students/999999/face", files=_photos(), headers=headers
    )
    assert response.status_code == 404
