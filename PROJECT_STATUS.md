# ClassSight — Project Status

**Audit Date:** September 13, 2026
**Branch:** `develop` (Commit: `21f97e6`)

---

## Summary

~38% MVP complete. Updated after `a9f3b2f` (frontend API client + route guard + CORS).

| Layer | % Done |
|---|---|
| Backend & Database | ~80% |
| Frontend UI | ~45% |
| Face Recognition | ~10% |
| NFC Fallback | ~15% |
| DevOps / Deployment | ~15% |

**Frontend mostly disconnected from backend.** Login + token + route guard now wired (`a9f3b2f`). Every data screen (dashboard, attendance, students, classes, reports) still mock data + localStorage. `api/classrooms.js` helpers exist, no page calls them yet.

---

## Architecture

```
FRONTEND (React 19, :5173)              BACKEND (FastAPI, :8000)
  - localStorage + mock data     X        - REST API (auth/classrooms/attendance)
  - setTimeout simulations       X        - JWT auth + RBAC
  - fetch client: login only     ->       - face recognition stub (returns [])
                                           - S3 upload (boto3)
                                                  |
                                           POSTGRES 16 (:5432)
                                             - 5 tables + Alembic migration
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19.2.8, Vite 8.2.0, React Router 7.18.3, Lucide React 1.39.0, Oxlint 1.75.0 |
| Backend | Python 3.13, FastAPI 0.141.1, Uvicorn 0.52.4 |
| ORM / DB | SQLAlchemy 2.0.43, Psycopg 3.2.10, PostgreSQL 16, Alembic 1.16.5 |
| Auth | python-jose[cryptography] 3.4.0, Passlib bcrypt 1.7.4 |
| Storage | boto3 1.40.32 (S3) |
| Testing | Pytest 8.4.2, HTTPX 0.28.1 |
| Deploy | Docker Compose (Postgres only) |

---

## Feature Matrix

| Feature | Status | Notes |
|---|---|---|
| Auth — Backend | DONE | |
| Auth — Frontend | PARTIAL | `Login.jsx` -> `POST /auth/login`, token in localStorage (`classsight_access_token`), error + submitting state, `logout()` on sign-out. No `AuthContext`; `getCurrentUser()` (`/auth/me`) defined but unused; no role handling |
| Route guards / RBAC frontend | PARTIAL | `components/RequireAuth.jsx` wraps all routes except `/` + `/login`; checks token presence only (no expiry check, no 401 handling, no role check) |
| Classroom CRUD — Backend | DONE | |
| Classroom UI | PARTIAL | `Classes.jsx` uses mock; `Classrooms.jsx` = `return <h1>Classrooms</h1>;`, not in router |
| Student management — Backend | PARTIAL | Add/list done; no face embedding enrollment endpoint |
| Student UI | PARTIAL | Full UI, mock data only (`mockStudents.js`) |
| Attendance session creation | DONE | |
| Attendance photo upload | DONE | S3 upload, stores `photo_url`, JPEG/PNG only |
| Face recognition processing | SCAFFOLDED | Stub returns `[]` (lines 26–27 in `face_recognition.py`) |
| Attendance confirmation | DONE | |
| Attendance logs | DONE | |
| Classroom analytics | DONE | |
| Attendance verification UI | PARTIAL | SVG donut chart, resolve modals, toasts; disconnected from backend |
| NFC resolution | NOT DONE | Frontend: `setTimeout` modal at `Dashboard.jsx:273`; backend: 0 endpoints, 0 schema cols |
| DB schema + migrations | DONE | Alembic revision `44dd15e91a66`; lacks `nfc_uid` col |
| Backend tests | DONE | 21 tests |
| Frontend tests | NOT DONE | Zero test files; no runner installed |
| Dockerization | SCAFFOLDED | Postgres only |
| CI/CD | NOT DONE | No `.github/workflows/` |

---

## DB Schema

```
users 1──N classrooms 1──N students
                 │                └──N attendance_records
                 └──N attendance_sessions──N attendance_records
```

**Constraints:**
- `users`: UQ index on `email`; role ENUM (`teacher`/`student`/`admin`)
- `classrooms`: UQ `(course, section)` → `uq_classrooms_course_section`; FK → users
- `students`: UQ `(classroom_id, roll_number)` → `uq_students_classroom_roll_number`; `face_embedding` LargeBinary nullable; FK → classrooms
- `attendance_sessions`: UQ `(classroom_id, session_date)` → `uq_attendance_sessions_classroom_date`; `photo_url` VARCHAR(2048); FK → classrooms
- `attendance_records`: UQ `(session_id, student_id)` → `uq_attendance_records_session_student`; CHECK `confidence BETWEEN 0 AND 1` (`ck_attendance_records_confidence_range`)

**Gaps:**
- No `nfc_uid` on `students` — absent despite being core feature
- Single embedding per student only (`LargeBinary` directly on row)
- No seed data; fresh DB after `alembic upgrade head` has 0 users

---

## Backend API

**Auth** (`app/api/auth.py`):
```
POST /auth/login   → {access_token, token_type: "bearer"} (JWT HS256, exp=480 min)
GET  /auth/me      → current user profile (UserOut)
```

**Users** (`app/api/users.py`):
```
POST /users        → admin creates user (email conflict check)
GET  /users        → admin lists all users
GET  /users/me     → current user profile
```

**Classrooms** (`app/api/classrooms.py`):
```
GET  /classrooms              → teacher's classrooms (admin: all)
POST /classrooms              → create; enforces UQ (course, section)
GET  /classrooms/{id}         → ownership enforced
GET  /classrooms/{id}/students → sorted by roll_number
POST /classrooms/{id}/students → enroll; duplicate roll rejected
```

**Attendance** (`app/api/attendance.py`):
```
POST /attendance/session    → create; rejects duplicate (classroom, date)
POST /attendance/upload     → multipart JPEG/PNG → S3 → stores photo_url
POST /attendance/process    → needs photo_url; calls recognize_faces stub
POST /attendance/confirm    → atomic replace of records; validates classroom membership
GET  /attendance/logs       → session history + records (ownership enforced)
GET  /attendance/analytics  → total_sessions, total_students, attendance rate, status counts (SQL aggregation)
```

**Auth deps** (`app/core/deps.py`): `get_current_user`, `require_roles(*roles)`, `get_owned_classroom`.
Admins bypass ownership. Teachers own only their classrooms.
JWT: HS256, `sub`=user.id, `role` claim, default expiry 480 min.

---

## Auth Flow

```
POST /auth/login {email, password}
  → bcrypt verify (passlib, automatic deprecation handling)
  → encode JWT (sub=user.id, role=user.role, exp=480 min)
  → {access_token, token_type: "bearer"}

Authenticated request: Authorization: Bearer <token>
  → OAuth2PasswordBearer extracts token
  → decode_access_token verifies sig + expiry
  → get_current_user (app/core/deps.py) loads user from DB
  → require_roles enforces RBAC
```

**Missing:**
1. Frontend: no token capture, no storage, no header attachment
2. No public registration — only admin can create users via `POST /users`
3. No refresh tokens; no auto-logout on 8h expiry
4. Swagger mismatch: `OAuth2PasswordBearer(tokenUrl="/auth/login")` expects form `username`+`password`; `/auth/login` takes JSON `{email, password}` → Swagger interactive auth returns 422

---

## Face Recognition Pipeline

| Stage | Status | Evidence | Next |
|---|---|---|---|
| Image collection | NOT DONE | — | Enrollment UI for student portraits |
| Preprocessing | NOT DONE | — | Normalize, resize, align |
| Face detection | NOT DONE | `face_recognition.py:26-27` | MTCNN / RetinaFace / MediaPipe |
| Embedding generation | NOT DONE | `face_recognition.py:26-27` | FaceNet / InsightFace / dlib |
| Embedding storage | PARTIAL | `models/student.py:25` | Column exists; no write endpoint |
| Face matching | NOT DONE | `face_recognition.py:26-27` | Cosine similarity / Euclidean distance |
| Confidence threshold | NOT DONE | `schemas/attendance.py:32` | Schema has float 0–1; logic absent |
| Candidate resolution | SCAFFOLDED | `api/attendance.py:130-146` | Maps match.student_id if returned; stub returns `[]` |
| Unrecognized count | SCAFFOLDED | `schemas/attendance.py:38` | `unrecognized_face_count` defined; stub returns 0 |
| Attendance persistence | DONE | `api/attendance.py:155-194` | Full DB write of status + confidence |
| Duplicate prevention | DONE | `models/attendance.py:56` | UQ `(session_id, student_id)` |
| Frontend integration | NOT DONE | `pages/Dashboard.jsx:273` | setTimeout simulation; backend ignored |

No CV libs in `requirements.txt` (`opencv`, `face_recognition`, `insightface`, `torch`, etc.).

---

## Frontend State & Mock Data

API client now at `frontend/src/api/` (`client.js` fetch wrapper + Bearer header + `ApiError`; `auth.js`: login/logout/getCurrentUser; `classrooms.js`: listClassrooms/getClassroom/listStudents). Base URL from `VITE_API_BASE_URL` (default `http://localhost:8000`, see `frontend/.env.example`). Only `login`/`logout` used by pages. Attendance, students, logs, analytics endpoints have no client wrapper. `frontend/src/services/` + `hooks/` still empty.

| Component | Data Source |
|---|---|
| Dashboard, Attendance, UnverifiedStudents, VerifiedStudents | `data/mockAttendance.js` + `context/AttendanceContext.jsx` |
| Students | `data/mockStudents.js` |
| Classes, Reports | Own internal mock arrays (defined inline) |

**Stub pages:**
- `pages/Classrooms.jsx`: `return <h1>Classrooms</h1>;` — not in router
- `pages/Settings.jsx`: `return <h1>Settings</h1>;`
- `pages/ReportDetails.jsx`: `<div className="blank-metrics-canvas">` placeholder, no actual graphs

**Built UI (mock-only):**
- `ThemeContext.jsx`: dark/light toggle, persisted to localStorage + system media query
- `AppNavigationDrawer.jsx`: responsive sidebar, `Escape` shortcut, route highlighting
- `Dashboard.jsx`: lecture schedule manager, session timer tick, animated photo-scan laser
- `Attendance.jsx`: SVG donut chart (interactive hover slices), verified/unverified tables, resolve modals, toast notifications
- `Students.jsx`: multi-column sort (name/roll/%), search, class filter, pagination, history modal
- `Classes.jsx`: course metrics, section filter, color-accented cards, timetable modals
- `Reports.jsx` / `AllReports.jsx`: lecture table, calendar date-range picker, detained students modal (< 75% threshold)

---

## Tests

**Backend — 21 tests (needs live Postgres at `classsight_test`; no SQLite fallback):**

`test_auth.py` (5):
- `test_login_succeeds_with_correct_credentials`
- `test_login_fails_with_wrong_password`
- `test_login_fails_for_unknown_email`
- `test_me_requires_bearer_token`
- `test_me_returns_current_user`

`test_classrooms.py` (6):
- `test_teacher_can_create_own_classroom`
- `test_teacher_cannot_create_classroom_for_another_teacher`
- `test_student_cannot_create_classroom`
- `test_teacher_cannot_view_another_teachers_classroom`
- `test_duplicate_course_section_is_rejected`
- `test_teacher_can_add_and_list_students`

`test_attendance.py` (7):
- `test_teacher_can_create_session_for_own_classroom`
- `test_other_teacher_cannot_create_session`
- `test_duplicate_session_date_rejected`
- `test_upload_process_confirm_flow` (S3 patched)
- `test_process_requires_uploaded_photo`
- `test_confirm_rejects_student_outside_classroom`
- `test_other_teacher_cannot_view_logs`

`test_models.py` (3):
- `test_model_registry_contains_all_readme_entities`
- `test_role_and_attendance_enums_persist_api_values`
- `test_attendance_records_require_unique_student_and_valid_confidence`

**Frontend:** 0 tests, no runner installed.
**Face recognition / NFC:** 0 tests (features not implemented).

---

## Current Actual Flow

```
1. /login → `POST /auth/login`, token stored, then navigate("/dashboard") (needs seeded user)
2. Dashboard → renders mock schedule from React state
3. Photo scan card → setTimeout(1600ms) laser animation — no file sent to S3
4. "Take Attendance" → loads 42 verified + 10 unverified from mockAttendance.js / localStorage
5. Resolve student (NFC/Manual/Absent) → moves object between React arrays → localStorage snapshot
6. "Save Record" → isSaved=true in localStorage — no DB write, POST /attendance/confirm never called
```

---

## What Works Now

**Frontend:** Launch Vite, log in against backend (needs a user in DB), view all dashboard screens, interact with mock attendance donut chart, simulate NFC resolve, save to localStorage.

**Backend (via tests or curl):** Create users, login for JWT, create classrooms, enroll students, create sessions, upload photos (needs AWS creds), confirm records, query analytics.

**Not demonstrable end-to-end:**
- Real photo → student detection (stub returns `[]`)
- Actual classroom/student data from DB in UI
- Physical NFC card tap → student resolution
- `docker compose up` for full stack (only Postgres containerized)

**Minimum for working E2E demo:**
1. ~~CORS on FastAPI~~ DONE
2. Seed: 1 teacher, 1 classroom, 10 students
3. Wire frontend dashboard to APIs (login done)
4. Basic face embedding matching on 10-student test dataset
5. Wire "Save Record" → `POST /attendance/confirm`

---

## Blockers & Risks

1. ~~CORS missing~~ FIXED in `a9f3b2f` — `CORSMiddleware` in `main.py`, origins from `CORS_ALLOWED_ORIGINS` (default `http://localhost:5173`). Deployed origin must be added to env
2. **No node_modules** — `react-router-dom` + `lucide-react` not installed; `npm run build` fails
3. **No seed script** — fresh DB has 0 users after `alembic upgrade head`; login impossible
4. **S3 tight coupling** — `s3_service.py` calls `boto3.client("s3")` directly; crashes with `NoCredentialsError` without AWS creds; no local fallback
5. **No NFC schema** — `nfc_uid` absent from `students` despite being core feature in proposal
6. **Hardcoded JWT secret** — `jwt_secret_key = "dev-secret-change-me"` default in `config.py`
7. **No frontend tests** — zero coverage; high regression risk when replacing mocks with API calls

---

## Remaining Tasks

### Critical (MVP blockers)
1. ~~Add `CORSMiddleware`~~ DONE
2. Seed script `backend/app/db/seed.py` — admin + teacher + classrooms + students
3. ~~Frontend API layer + token storage + route guard~~ DONE (`src/api/`, `RequireAuth`). Left: `AuthContext`, 401 handling, role-aware routes, API wrappers for attendance/students/logs/analytics
4. ~~Wire `Login.jsx` → `POST /auth/login`~~ DONE
5. Implement face recognition: add CV libs to `requirements.txt`; detection + embedding + cosine match in `face_recognition.py`
6. Student face enrollment endpoint `POST /classrooms/{id}/students/{sid}/embedding`
7. Wire attendance flow: Dashboard photo → `/attendance/upload`+`/process`; "Save Record" → `/attendance/confirm`

### High
8. `npm install` in `frontend/`
9. Add `nfc_uid` to Student model + Alembic migration + `POST /attendance/session/{id}/scan`
10. Web NFC (`NDEFReader`) in Dashboard + Attendance pages
11. Replace stubs: `Classrooms.jsx`, `Settings.jsx`, `ReportDetails.jsx`
12. Dockerfiles for backend + frontend; update `docker-compose.yml`

### Medium
13. Local S3 fallback in `s3_service.py` for offline dev
14. SQLite in-memory fallback in `conftest.py` for CI
15. Frontend tests — Vitest + React Testing Library (`AttendanceContext`, `Dashboard`, `Attendance`)
16. CI/CD — `.github/workflows/ci.yml`
17. CSV export for attendance logs + reports

### Low
18. Fix Swagger OAuth2 mismatch (form vs JSON)
19. Fill `docs/` subdirs (HLD, LLD, SRS)
20. Remove `backend/package.json` (unused Node artifact in Python dir)

---

## Recommended Order

```
1. ~~CORS middleware~~ done; npm install
2. DB seed script
3. ~~Frontend auth (API client → login → route guard)~~ done
4. Classrooms + Students pages pull from API
5. Face recognition (CV libs + embedding + enrollment endpoint)
6. Wire attendance flow end-to-end (upload → process → confirm)
7. NFC: nfc_uid schema + backend endpoint + Web NFC frontend
8. Reports pull from /analytics + /logs
9. Dockerfiles + docker-compose + CI/CD
```

---

## Final Score

| Dimension | Rating |
|---|---|
| Backend APIs | DONE |
| DB Schema | DONE (missing nfc_uid) |
| Frontend UI | PARTIAL (~80% screens; stubs remain) |
| Frontend-Backend Integration | PARTIAL (~15%: login + route guard only; all data screens mock) |
| Face Recognition | SCAFFOLDED (28-line stub) |
| NFC | NOT DONE |
| DevOps | SCAFFOLDED (Postgres only) |
| **Overall MVP** | **~38%** |
