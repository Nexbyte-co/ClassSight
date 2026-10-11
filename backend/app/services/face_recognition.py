"""Boundary between AI face-recognition output and attendance confirmation.

This module defines the contract `attendance.process` relies on. The actual
model integration is owned by the AI/NFC track (see
README-Manit-AI-NFC-AWS-DevOps.md); this stub returns no recognized faces so
the API contract is exercisable end-to-end before that integration lands.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RecognitionMatch:
    student_id: int
    confidence: float


@dataclass
class RecognitionResult:
    matches: list[RecognitionMatch]
    unrecognized_face_count: int


def recognize_faces(photo_url: str, candidate_student_ids: list[int]) -> RecognitionResult:
    return RecognitionResult(matches=[], unrecognized_face_count=0)
