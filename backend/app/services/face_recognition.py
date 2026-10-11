"""Boundary between AI face-recognition output and attendance confirmation.

Pipeline: detect -> align -> embed (InsightFace ArcFace, 512-d) -> cosine
match against enrolled student embeddings. This module has no DB or S3 code:
callers pass in image bytes and the candidates' stored embeddings.

A wrong "present" is worse than a miss, so matching is conservative. A face is
only auto-matched when it clears MATCH_THRESHOLD and beats its runner-up by
AMBIGUITY_MARGIN; everything else counts as unrecognized and falls back to
NFC / manual confirmation. Both values are starting points to be tuned on the
Phase 0 evaluation set.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass

import numpy as np
from scipy.optimize import linear_sum_assignment

MATCH_THRESHOLD = 0.5
AMBIGUITY_MARGIN = 0.05
EMBEDDING_DIM = 512

_model = None
_model_lock = threading.Lock()


@dataclass
class RecognitionMatch:
    student_id: int
    confidence: float


@dataclass
class RecognitionResult:
    matches: list[RecognitionMatch]
    unrecognized_face_count: int


def _normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=-1, keepdims=True)
    return vectors / np.maximum(norms, 1e-12)


def embedding_to_bytes(embedding: np.ndarray) -> bytes:
    return _normalize(np.asarray(embedding, dtype=np.float32)).tobytes()


def embedding_from_bytes(data: bytes) -> np.ndarray:
    return np.frombuffer(data, dtype=np.float32)


def mean_embedding(embeddings: list[np.ndarray]) -> np.ndarray:
    """Average several photos of one student into a single enrollment embedding."""
    return _normalize(_normalize(np.stack(embeddings)).mean(axis=0))


def match_embeddings(
    face_embeddings: np.ndarray,
    candidates: list[tuple[int, np.ndarray]],
    threshold: float = MATCH_THRESHOLD,
    margin: float = AMBIGUITY_MARGIN,
) -> RecognitionResult:
    """Match detected faces (F x d) to candidate students, one face per student."""
    face_count = len(face_embeddings)
    if face_count == 0 or not candidates:
        return RecognitionResult(matches=[], unrecognized_face_count=face_count)

    faces = _normalize(np.asarray(face_embeddings, dtype=np.float32))
    enrolled = _normalize(np.stack([emb for _, emb in candidates]).astype(np.float32))
    similarity = faces @ enrolled.T

    rows, cols = linear_sum_assignment(-similarity)
    matches: list[RecognitionMatch] = []
    for face_idx, cand_idx in zip(rows, cols):
        score = float(similarity[face_idx, cand_idx])
        if score < threshold:
            continue
        others = np.delete(similarity[face_idx], cand_idx)
        if others.size and float(others.max()) > score - margin:
            continue
        matches.append(
            RecognitionMatch(
                student_id=candidates[cand_idx][0],
                confidence=min(max(score, 0.0), 1.0),
            )
        )
    return RecognitionResult(
        matches=matches, unrecognized_face_count=face_count - len(matches)
    )


def _get_model():
    global _model
    with _model_lock:
        if _model is None:
            from insightface.app import FaceAnalysis

            model = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            model.prepare(ctx_id=-1, det_size=(640, 640))
            _model = model
    return _model


def extract_face_embeddings(image_bytes: bytes) -> np.ndarray:
    """Detect every face in an image and return their embeddings (F x 512)."""
    import cv2

    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")
    faces = _get_model().get(image)
    if not faces:
        return np.empty((0, EMBEDDING_DIM), dtype=np.float32)
    return np.stack([face.normed_embedding for face in faces]).astype(np.float32)


class EnrollmentError(ValueError):
    """An enrollment photo can't be used (undecodable, no face, or several faces)."""


def build_enrollment_embedding(images: list[bytes]) -> bytes:
    """Turn 1+ close-up photos of one student into the bytes stored on the student.

    Every photo must contain exactly one face so a group shot can't be enrolled
    under the wrong student. The photos themselves are never persisted.
    """
    embeddings: list[np.ndarray] = []
    for position, image_bytes in enumerate(images, start=1):
        try:
            faces = extract_face_embeddings(image_bytes)
        except ValueError as exc:
            raise EnrollmentError(f"Photo {position}: {exc}") from exc
        if len(faces) != 1:
            raise EnrollmentError(
                f"Photo {position}: expected exactly one face, found {len(faces)}"
            )
        embeddings.append(faces[0])
    return embedding_to_bytes(mean_embedding(embeddings))


def recognize_faces(
    image_bytes: bytes, candidates: list[tuple[int, bytes]]
) -> RecognitionResult:
    """`candidates` is [(student_id, stored embedding bytes)] for enrolled students."""
    decoded = [(sid, embedding_from_bytes(data)) for sid, data in candidates]
    return match_embeddings(extract_face_embeddings(image_bytes), decoded)
