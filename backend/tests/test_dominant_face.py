import io
from unittest.mock import patch

import numpy as np
import pytest

from app.services import face_recognition
from tests.conftest import auth_headers
from tests.test_verify import TEACHER, _unit, enrolled  # noqa: F401  (fixture)

DIM = face_recognition.EMBEDDING_DIM


def _faces(*areas):
    embeddings = np.stack([_unit(i) for i in range(len(areas))]) if areas else np.empty((0, DIM), np.float32)
    return embeddings, np.array(areas, dtype=np.float32)


def test_clearly_dominant_face_is_kept_alone():
    embeddings, areas = _faces(100.0, 8000.0, 400.0)  # middle one is 20x the next
    kept = face_recognition.dominant_face_only(embeddings, areas)
    assert kept.shape == (1, DIM)
    assert np.array_equal(kept[0], embeddings[1])


def test_ratio_boundary_is_inclusive():
    just_enough = face_recognition.dominant_face_only(*_faces(500.0, 100.0))
    assert just_enough.shape == (1, DIM)  # exactly 5x
    too_close = face_recognition.dominant_face_only(*_faces(499.0, 100.0))
    assert too_close.shape == (2, DIM)  # just under 5x: both kept, caller rejects


def test_similar_sized_faces_are_all_kept():
    assert face_recognition.dominant_face_only(*_faces(1000.0, 900.0, 800.0)).shape == (3, DIM)


@pytest.mark.parametrize("areas", [(), (123.0,)])
def test_zero_or_one_face_unchanged(areas):
    embeddings, sizes = _faces(*areas)
    assert face_recognition.dominant_face_only(embeddings, sizes).shape == (len(areas), DIM)


def _capture(client, classroom):
    return client.post(
        f"/classrooms/{classroom.id}/verify",
        files={"file": ("capture.jpg", io.BytesIO(_tiny_jpeg()), "image/jpeg")},
        headers=auth_headers(client, *TEACHER),
    )


def _tiny_jpeg():
    import cv2

    ok, buf = cv2.imencode(".jpg", np.full((8, 8, 3), 128, np.uint8))
    assert ok
    return buf.tobytes()


def test_verify_uses_dominant_face_and_ignores_background_face(client, teacher_user, classroom, enrolled):
    # Alice-like background face is tiny; Bob is the subject.
    embeddings, areas = np.stack([_unit(0), _unit(1)]), np.array([100.0, 9000.0], np.float32)
    with patch.object(face_recognition, "_detect", return_value=(embeddings, areas)):
        body = _capture(client, classroom).json()
    assert body["verified"] is True
    assert body["student"]["roll_number"] == "R002"


def test_verify_still_rejects_two_comparable_faces(client, teacher_user, classroom, enrolled):
    embeddings, areas = np.stack([_unit(0), _unit(1)]), np.array([9000.0, 8000.0], np.float32)
    with patch.object(face_recognition, "_detect", return_value=(embeddings, areas)):
        response = _capture(client, classroom)
    assert response.status_code == 422
    assert "exactly one face" in response.json()["detail"]


def test_zero_area_boxes_are_not_a_dominant_face():
    assert face_recognition.dominant_face_only(*_faces(0.0, 0.0)).shape == (2, DIM)


def test_enrollment_accepts_dominant_face_and_rejects_comparable_faces():
    embeddings, areas = np.stack([_unit(0), _unit(1)]), np.array([9000.0, 100.0], np.float32)
    with patch.object(face_recognition, "_detect", return_value=(embeddings, areas)):
        stored = face_recognition.build_enrollment_embedding([_tiny_jpeg()])
    assert np.allclose(face_recognition.embedding_from_bytes(stored), _unit(0), atol=1e-5)

    areas = np.array([9000.0, 8000.0], np.float32)
    with patch.object(face_recognition, "_detect", return_value=(embeddings, areas)):
        with pytest.raises(face_recognition.EnrollmentError, match="exactly one face"):
            face_recognition.build_enrollment_embedding([_tiny_jpeg()])
