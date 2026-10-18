import io
from unittest.mock import patch

import cv2
import numpy as np

from app.core.config import get_settings
from app.models import StudentPhoto
from app.services import face_recognition
from tests.conftest import auth_headers

TEACHER = ("teacher1@classsight.example", "teacherpass123")


def _photos(count=1):
    return [("files", (f"p{i}.jpg", io.BytesIO(b"img"), "image/jpeg")) for i in range(count)]


def _one_face(_image_bytes):
    return np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)


def _url(classroom, student):
    return f"/classrooms/{classroom.id}/students/{student.id}/face"


def _enroll(client, headers, classroom, student, count=1):
    with patch.object(face_recognition, "extract_face_embeddings", _one_face):
        return client.post(_url(classroom, student), files=_photos(count), headers=headers)


def test_enroll_stores_normalised_embedding_and_photos(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    response = _enroll(client, headers, classroom, student, count=2)

    assert response.status_code == 200, response.text
    assert response.json() == {"student_id": student.id, "photos_used": 2}
    db_session.refresh(student)
    stored = face_recognition.embedding_from_bytes(student.face_embedding)
    assert stored.shape == (face_recognition.EMBEDDING_DIM,)
    assert np.isclose(np.linalg.norm(stored), 1.0, atol=1e-5)

    keys = [photo.s3_key for photo in student.photos]
    assert len(keys) == 2
    assert all(key.startswith(f"students/{student.roll_number}/") for key in keys)
    assert set(fake_s3.objects) == set(keys)

    listing = client.get(f"/classrooms/{classroom.id}/students", headers=headers)
    assert listing.json()[0]["face_enrolled"] is True


def test_photo_with_no_or_multiple_faces_is_rejected_and_nothing_stored(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    for face_count in (0, 2):
        faces = np.ones((face_count, face_recognition.EMBEDDING_DIM), dtype=np.float32)
        with patch.object(face_recognition, "extract_face_embeddings", lambda _b, f=faces: f):
            response = client.post(_url(classroom, student), files=_photos(), headers=headers)
        assert response.status_code == 422
        assert "exactly one face" in response.json()["detail"]

    assert fake_s3.objects == {}
    assert db_session.query(StudentPhoto).count() == 0


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


def test_re_enrollment_replaces_old_photos(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    _enroll(client, headers, classroom, student, count=2)
    first_keys = set(fake_s3.objects)

    response = _enroll(client, headers, classroom, student, count=1)
    assert response.status_code == 200, response.text

    db_session.refresh(student)
    assert len(student.photos) == 1
    assert set(fake_s3.objects) == {student.photos[0].s3_key}
    assert not first_keys & set(fake_s3.objects)


def test_storage_failure_returns_503_and_saves_nothing(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    fake_s3.fail = True
    headers = auth_headers(client, *TEACHER)
    response = _enroll(client, headers, classroom, student)

    assert response.status_code == 503
    db_session.refresh(student)
    assert student.face_embedding is None
    assert student.photos == []


def test_profile_lists_presigned_photo_urls(
    client, teacher_user, classroom, student, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    _enroll(client, headers, classroom, student, count=2)

    profile = client.get(f"/classrooms/{classroom.id}/students/{student.id}", headers=headers)
    assert profile.status_code == 200, profile.text
    body = profile.json()
    assert body["roll_number"] == student.roll_number
    assert body["face_enrolled"] is True
    assert len(body["photos"]) == 2
    assert all(photo["url"].startswith("https://fake-s3/students/") for photo in body["photos"])


def test_other_teacher_cannot_view_profile(client, classroom, student, other_teacher_user):
    headers = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    response = client.get(f"/classrooms/{classroom.id}/students/{student.id}", headers=headers)
    assert response.status_code == 403


def test_delete_face_removes_photos_and_embedding(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    _enroll(client, headers, classroom, student, count=2)

    response = client.delete(_url(classroom, student), headers=headers)
    assert response.status_code == 204

    db_session.refresh(student)
    assert student.face_embedding is None
    assert student.photos == []
    assert fake_s3.objects == {}


def test_delete_face_storage_failure_changes_nothing(
    client, teacher_user, classroom, student, db_session, fake_s3
):
    headers = auth_headers(client, *TEACHER)
    _enroll(client, headers, classroom, student, count=1)
    fake_s3.fail = True

    response = client.delete(_url(classroom, student), headers=headers)
    assert response.status_code == 503
    db_session.refresh(student)
    assert student.face_embedding is not None
    assert len(student.photos) == 1


def _jpeg_bytes():
    ok, encoded = cv2.imencode(".jpg", np.full((32, 32, 3), 128, dtype=np.uint8))
    assert ok
    return encoded.tobytes()


def test_augment_variants_are_mild_and_same_shape():
    image = np.full((32, 32, 3), 128, dtype=np.uint8)
    variants = face_recognition.augment_variants(image)
    assert len(variants) == 3
    assert all(v.shape == image.shape for v in variants)
    assert {int(v.mean()) for v in variants} == {128, 168, 88}


def test_augmented_enrollment_embeds_copies_and_skips_lost_faces():
    calls = []

    def fake_embed(image):
        calls.append(image)
        # The darkest copy "loses" the face; it must be skipped, not fail enrollment.
        if image.mean() < 100:
            return np.empty((0, face_recognition.EMBEDDING_DIM), dtype=np.float32)
        return np.eye(1, face_recognition.EMBEDDING_DIM, 3, dtype=np.float32)

    with patch.object(face_recognition, "embed_image", fake_embed):
        stored = face_recognition.build_enrollment_embedding([_jpeg_bytes()], augment=True)

    assert len(calls) == 4  # original + mirror + brighter + darker
    assert np.isclose(face_recognition.embedding_from_bytes(stored)[3], 1.0, atol=1e-5)


def test_enroll_endpoint_uses_augment_setting(
    client, teacher_user, classroom, student, fake_s3, monkeypatch
):
    monkeypatch.setattr(get_settings(), "enroll_augment", True)
    headers = auth_headers(client, *TEACHER)
    with patch.object(
        face_recognition, "build_enrollment_embedding", return_value=b"\0" * 2048
    ) as build:
        response = client.post(_url(classroom, student), files=_photos(), headers=headers)
    assert response.status_code == 200, response.text
    assert build.call_args.kwargs["augment"] is True
