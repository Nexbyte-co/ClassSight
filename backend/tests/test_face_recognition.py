import numpy as np
import pytest

from app.services import face_recognition
from app.services.face_recognition import (
    embedding_from_bytes,
    embedding_to_bytes,
    match_embeddings,
    mean_embedding,
)


def _unit(seed: int, dim: int = 512) -> np.ndarray:
    vec = np.random.default_rng(seed).normal(size=dim).astype(np.float32)
    return vec / np.linalg.norm(vec)


def _noisy(vec: np.ndarray, seed: int, noise: float = 0.015) -> np.ndarray:
    jitter = np.random.default_rng(seed).normal(size=vec.shape).astype(np.float32) * noise
    return vec + jitter


def test_matches_each_face_to_correct_student():
    candidates = [(1, _unit(1)), (2, _unit(2)), (3, _unit(3))]
    faces = np.stack([_noisy(_unit(3), 10), _noisy(_unit(1), 11)])

    result = match_embeddings(faces, candidates)

    assert {m.student_id for m in result.matches} == {1, 3}
    assert result.unrecognized_face_count == 0
    assert all(0 <= m.confidence <= 1 for m in result.matches)


def test_unknown_face_is_unrecognized_not_guessed():
    candidates = [(1, _unit(1)), (2, _unit(2))]
    faces = np.stack([_unit(99)])

    result = match_embeddings(faces, candidates)

    assert result.matches == []
    assert result.unrecognized_face_count == 1


def test_one_student_cannot_claim_two_faces():
    candidates = [(1, _unit(1))]
    faces = np.stack([_noisy(_unit(1), 20), _noisy(_unit(1), 21)])

    result = match_embeddings(faces, candidates)

    assert len(result.matches) <= 1
    assert len(result.matches) + result.unrecognized_face_count == 2


def test_ambiguous_face_between_two_students_is_rejected():
    base = _unit(1)
    near_twin = base + _unit(2) * 0.02
    candidates = [(1, base), (2, near_twin)]
    faces = np.stack([base])

    result = match_embeddings(faces, candidates)

    assert result.matches == []
    assert result.unrecognized_face_count == 1


def test_no_faces_or_no_candidates():
    assert match_embeddings(np.empty((0, 512)), [(1, _unit(1))]).unrecognized_face_count == 0
    result = match_embeddings(np.stack([_unit(1), _unit(2)]), [])
    assert result.matches == [] and result.unrecognized_face_count == 2


def test_embedding_bytes_roundtrip_and_mean():
    vec = _unit(5)
    assert np.allclose(embedding_from_bytes(embedding_to_bytes(vec)), vec, atol=1e-6)

    avg = mean_embedding([_noisy(vec, 1), _noisy(vec, 2), _noisy(vec, 3)])
    assert np.isclose(np.linalg.norm(avg), 1.0, atol=1e-5)
    assert float(avg @ vec) > 0.95


def test_identify_face_reports_reason():
    candidates = [(1, _unit(0)), (2, _unit(1))]
    matched = face_recognition.identify_face(_unit(1), candidates)
    assert (matched.student_id, matched.reason) == (2, face_recognition.MATCHED)

    stranger = face_recognition.identify_face(_unit(5), candidates)
    assert (stranger.student_id, stranger.reason) == (None, face_recognition.BELOW_THRESHOLD)

    between = face_recognition._normalize(_unit(0) + _unit(1))
    ambiguous = face_recognition.identify_face(between, candidates)
    assert (ambiguous.student_id, ambiguous.reason) == (None, face_recognition.AMBIGUOUS)


def test_identify_face_with_single_candidate_has_no_runner_up():
    result = face_recognition.identify_face(_unit(0), [(1, _unit(0))])
    assert (result.student_id, result.reason) == (1, face_recognition.MATCHED)


def test_undecodable_bytes_raise_invalid_image():
    with pytest.raises(face_recognition.InvalidImageError):
        face_recognition.decode_image(b"not an image")
