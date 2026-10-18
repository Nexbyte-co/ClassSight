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

import logging
import threading
from dataclasses import dataclass

import numpy as np
from scipy.optimize import linear_sum_assignment

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.5
AMBIGUITY_MARGIN = 0.05
EMBEDDING_DIM = 512

# Decision reasons, shared by group matching and single-face verification.
MATCHED = "matched"
BELOW_THRESHOLD = "below_threshold"
AMBIGUOUS = "ambiguous"
UNASSIGNED = "unassigned"  # more faces than candidates; no student left to compare with

# Light enrollment augmentation: a mirror copy plus one copy per brightness offset.
AUGMENT_BRIGHTNESS_SHIFTS = (40, -40)

_model = None
_model_lock = threading.Lock()


@dataclass
class FaceDecision:
    """Outcome for one detected face. `student_id` is set only when `reason` is MATCHED."""

    face_index: int
    student_id: int | None
    confidence: float | None  # best score clamped to [0, 1]; None if no candidate was left
    reason: str


@dataclass
class RecognitionResult:
    decisions: list[FaceDecision]  # exactly one per detected face, in face order

    @property
    def matches(self) -> list[FaceDecision]:
        return [d for d in self.decisions if d.reason == MATCHED]

    @property
    def unrecognized_face_count(self) -> int:
        return len(self.decisions) - len(self.matches)


class InvalidImageError(ValueError):
    """The uploaded bytes could not be decoded as an image."""


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


def _decide(score: float, runner_up: float | None, threshold: float, margin: float) -> str:
    if score < threshold:
        return BELOW_THRESHOLD
    if runner_up is not None and runner_up > score - margin:
        return AMBIGUOUS
    return MATCHED


def _confidence(score: float) -> float:
    return min(max(score, 0.0), 1.0)


def match_embeddings(
    face_embeddings: np.ndarray,
    candidates: list[tuple[int, np.ndarray]],
    threshold: float = MATCH_THRESHOLD,
    margin: float = AMBIGUITY_MARGIN,
) -> RecognitionResult:
    """Decide every detected face (F x d) against candidate students, one face per student.

    Group photos (/process) and single-face verification (/verify) both use this,
    so they share one scoring path and one accept/reject rule.
    """
    face_count = len(face_embeddings)
    decisions = [
        FaceDecision(face_index=i, student_id=None, confidence=None, reason=UNASSIGNED)
        for i in range(face_count)
    ]
    if face_count == 0 or not candidates:
        return RecognitionResult(decisions=decisions)

    faces = _normalize(np.asarray(face_embeddings, dtype=np.float32))
    enrolled = _normalize(np.stack([emb for _, emb in candidates]).astype(np.float32))
    similarity = faces @ enrolled.T

    # With more faces than candidates, the faces left over stay UNASSIGNED.
    rows, cols = linear_sum_assignment(-similarity)
    for face_idx, cand_idx in zip(rows, cols):
        score = float(similarity[face_idx, cand_idx])
        others = np.delete(similarity[face_idx], cand_idx)
        runner_up = float(others.max()) if others.size else None
        reason = _decide(score, runner_up, threshold, margin)
        logger.info(
            "face %d: best=%.3f runner_up=%s -> %s",
            face_idx,
            score,
            f"{runner_up:.3f}" if runner_up is not None else "none",
            reason,
        )
        decisions[face_idx] = FaceDecision(
            face_index=int(face_idx),
            student_id=candidates[cand_idx][0] if reason == MATCHED else None,
            confidence=_confidence(score),
            reason=reason,
        )

    result = RecognitionResult(decisions=decisions)
    logger.info(
        "matched %d of %d face(s) against %d candidate(s)",
        len(result.matches),
        face_count,
        len(candidates),
    )
    return result


def _get_model():
    global _model
    with _model_lock:
        if _model is None:
            from insightface.app import FaceAnalysis

            model = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            model.prepare(ctx_id=-1, det_size=(640, 640))
            _model = model
    return _model


def decode_image(image_bytes: bytes) -> np.ndarray:
    import cv2

    image = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise InvalidImageError("Could not decode image")
    return image


def embed_image(image: np.ndarray) -> np.ndarray:
    """Detect every face in a decoded image and return their embeddings (F x 512)."""
    faces = _get_model().get(image)
    if not faces:
        return np.empty((0, EMBEDDING_DIM), dtype=np.float32)
    return np.stack([face.normed_embedding for face in faces]).astype(np.float32)


def extract_face_embeddings(image_bytes: bytes) -> np.ndarray:
    """Detect every face in an image and return their embeddings (F x 512)."""
    return embed_image(decode_image(image_bytes))


def augment_variants(image: np.ndarray) -> list[np.ndarray]:
    """Mirror copy plus brighter/darker copies; mild on purpose so identity is preserved."""
    import cv2

    variants = [cv2.flip(image, 1)]
    for shift in AUGMENT_BRIGHTNESS_SHIFTS:
        variants.append(cv2.convertScaleAbs(image, alpha=1.0, beta=shift))
    return variants


def _augmented_embeddings(image_bytes: bytes, position: int) -> list[np.ndarray]:
    """Embeddings of the augmented copies; a copy where the face is lost is skipped."""
    kept: list[np.ndarray] = []
    for variant in augment_variants(decode_image(image_bytes)):
        faces = embed_image(variant)
        if len(faces) == 1:
            kept.append(faces[0])
    logger.info("enroll photo %d: %d augmented copies used", position, len(kept))
    return kept


class EnrollmentError(ValueError):
    """An enrollment photo can't be used (undecodable, no face, or several faces)."""


def build_enrollment_embedding(images: list[bytes], augment: bool = False) -> bytes:
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
        logger.info("enroll photo %d: %d face(s) found", position, len(faces))
        if len(faces) != 1:
            raise EnrollmentError(
                f"Photo {position}: expected exactly one face, found {len(faces)}"
            )
        embeddings.append(faces[0])
        if augment:
            embeddings.extend(_augmented_embeddings(image_bytes, position))
    return embedding_to_bytes(mean_embedding(embeddings))


def recognize_faces(
    image_bytes: bytes, candidates: list[tuple[int, bytes]]
) -> RecognitionResult:
    """`candidates` is [(student_id, stored embedding bytes)] for enrolled students."""
    decoded = [(sid, embedding_from_bytes(data)) for sid, data in candidates]
    return match_embeddings(extract_face_embeddings(image_bytes), decoded)
