# Face recognition model: session context

Branch: `feature/face-recognition-model` (from `develop`). Session date: 2026-10-11.
Companion to the root `CLAUDE.md` (which must stay at the repo root to be auto-loaded).

## Goal
Replace the `face_recognition.py` stub with a real pipeline using pretrained InsightFace
(`buffalo_l`: SCRFD detector + ArcFace 512-d embeddings). No training from scratch.
Pipeline: detect -> align -> embed -> cosine match against enrolled student embeddings.

## Decisions
- **Embeddings live in Postgres** (`students.face_embedding`, float32 bytes, L2-normalised). S3 holds raw images only.
- **Model never reads S3.** The backend fetches bytes (`s3_service.get_object_bytes`), `cv2.imdecode` makes a pixel array, the model sees only the array.
- **Classroom photos are kept in S3 with an expiry** (lifecycle rule, 30-90 days) for audit/re-run. Bucket private; IAM role needs `s3:GetObject` + `PutObject`.
- **Enrollment photos are never stored.** Embedding is computed in the backend process (in memory, CPU) and only the averaged embedding is saved.
- **A false accept (wrong student marked present) is worse than a miss.** Conservative threshold; uncertain/unmatched faces fall back to NFC or manual confirmation (unverified list).
- Inference location (in-backend vs separate service) is undecided; everything sits behind `recognize_faces()` so it can move later.

## Done (this branch)
- `backend/requirements.txt`: insightface 2.1, onnxruntime 1.31.0, opencv-python-headless 5.0.0.93, numpy 2.5.4, scipy 1.18.1 (install + import verified on Python 3.13).
- `services/s3_service.py`: `key_from_url`, `get_object_bytes`.
- `services/face_recognition.py`: real pipeline.
  - `match_embeddings`: cosine similarity matrix + Hungarian assignment (one face per student). Accept only if score >= `MATCH_THRESHOLD` (0.5) and it beats the runner-up by `AMBIGUITY_MARGIN` (0.05). Thresholds are untuned placeholders.
  - `build_enrollment_embedding`: requires exactly one face per photo, averages, normalises. Raises `EnrollmentError`.
  - Lazy, thread-safe model load; embedding byte helpers.
- `api/attendance.py` `/process`: collects students with embeddings, fetches photo from S3, calls `recognize_faces(image_bytes, candidates)`. If nobody has an embedding it skips S3 and recognition.
- `api/classrooms.py`: `POST /classrooms/{id}/students/{student_id}/face` (1-5 JPEG/PNG photos, <=10 MB each, ownership via `get_owned_classroom`). `FaceEnrollmentOut` in `schemas/student.py`.
- Tests: `tests/test_face_recognition.py` (6 pass, synthetic embeddings, no model load); `tests/test_enrollment.py` (5 API tests, model mocked).

## Verified vs not
- Verified: dependencies install/import; 6 unit tests pass; enrollment logic exercised directly with a mocked detector.
- NOT run: the existing suite and `test_enrollment.py` (need Postgres; Docker daemon was not running). `test_upload_process_confirm_flow` should still pass (student has no embedding, so the S3 fetch is skipped) but is unconfirmed.
- NOT done: real model on real photos (first run downloads ~280 MB of weights); threshold tuning; any AWS setup.

## Remaining
1. Run `pytest` with Postgres up.
2. `ml/` evaluation script on real photos to tune threshold/margin (needs real photos: enrollment portraits + labelled classroom shots).
3. `face_enrolled` flag on `StudentOut` for the UI.
4. AWS: private bucket, GetObject/PutObject IAM, lifecycle expiry.
5. Frontend wiring (all data screens are still mock): API wrappers, enrollment UI on Students page, attendance flow -> `resolveStudent(id, "ai")`, real student IDs.
6. Seed script (`backend/app/db/seed.py`): fresh DB has 0 users so login is impossible.
7. Optional: `needs_review` field on `/process` for borderline faces; NFC (`nfc_uid` missing on students); liveness; privacy/consent and deletion of embeddings.

## Environment notes
- Frontend dev server runs at http://localhost:5173 (`npm run dev` in `frontend/`). `react-router-dom` and `lucide-react` were declared but not installed; `npm install` fixed it (node_modules only). `npm install` reported 1 high-severity vulnerability, not investigated.
- Without a backend, bypass the route guard with `localStorage.setItem("classsight_access_token", "dev")`.
- Scratch venv with the ML deps was created outside the repo; nothing project-side depends on it.

## Session 2026-10-18 (Phase A of the MVP plan)
Decisions changed since 2026-10-11: **enrollment photos ARE now stored** (private S3, `students/{roll}/`, deletable via `DELETE …/face`), and `roll_number` is the college roll no., unique college-wide. MVP scope: one classroom, one teacher.

Done:
- Postgres compose password aligned to `classsight`; `deployment/init-test-db.sql` creates `classsight_test` on a fresh volume. `session.py` now reads `get_settings()` (was ignoring `.env`).
- `app/db/seed.py`: first admin only (`SEED_ADMIN_EMAIL`); no fake data by user request.
- `face_enrolled` on `StudentOut`; `StudentPhoto` model; migration `b7d2e4f1a903` (checked with `alembic check` + down/up).
- `POST /classrooms/{id}/verify` (one face, reasons `matched|below_threshold|ambiguous|no_enrolled_students`); profile `GET …/students/{sid}` with presigned URLs; `DELETE …/face`; `/process` returns 422 on undecodable photo.
- `ENROLL_AUGMENT` (mirror + ±40 brightness copies, off by default), `S3_ENDPOINT_URL`, `LOG_LEVEL`; step logging (scores/keys/counts only).
- 59 tests pass (model + S3 faked via `fake_s3`). Mutation check: forcing `_decide` to always match fails 6 safety tests.
- Real-model smoke (insightface sample `t1.jpg`, 6 people, margin crops): 6/6 identified from darker mirrored copies (conf 0.91–0.96), non-enrolled person rejected (0.04), group photo rejected for enrollment. Not an accuracy measurement (probes derived from the same photo).

Observed: a 112×112 tightly-cropped face (`Tom_Hanks_54745.png`) gives **0 detections** — the detector needs margin around the face. Tightly cropped / tiny enrollment photos (e.g. ID-card crops) will fail; possible fix is padding before detection. Check during Phase C.

Next: Phases B–E (containers, local MinIO e2e with real photos, EC2, frontend plan) on a new branch from this one. Plan: `~/.claude/plans/abundant-orbiting-octopus.md`.
