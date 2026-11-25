# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI classroom attendance. Teachers manage classrooms, upload photos, face recognition identifies students. Backend API complete + tested. Frontend: login, dashboard, attendance, students, verify, the admin area and the student portal (students sign in at `/login`) run on the API: nothing in the app uses sample data any more. Deployed to a single EC2 instance for the demo (see Deployment).

## Structure

```
backend/    FastAPI + Python
frontend/   React + Vite (JS)
database/   Schema docs
deployment/ Docker Compose: Postgres by default; full app (backend, frontend, local S3) via profiles; EC2 override adds Caddy HTTPS. See deployment/README.md
docs/       e2e-verification.md (test report), aws-deployment.md (EC2 guide)
```

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Postgres via Docker** (no profiles = Postgres only; `--profile app --profile local` = whole app, see `deployment/README.md`):
```bash
docker compose -f deployment/docker-compose.yml up -d
alembic upgrade head
SEED_ADMIN_EMAIL=you@school.edu python -m app.db.seed   # first admin; fresh DB has 0 users
```

**Tests** — need Postgres at `postgresql+psycopg://classsight:classsight@localhost:5432/classsight_test`. Compose creates `classsight_test` only on a fresh volume (`deployment/init-test-db.sql`); on an older volume create it manually (see `backend/README.md`). `conftest.py` drops/creates schema per test.

```bash
cd backend
pytest                         # all
pytest tests/test_auth.py      # single file
pytest -k "test_login"         # single test
```

**`.env` keys:**
```
DATABASE_URL=postgresql+psycopg://classsight:classsight@localhost:5432/classsight
JWT_SECRET_KEY=<secret>
S3_BUCKET_NAME=classsight-attendance-photos
AWS_REGION=us-east-1
CORS_ALLOWED_ORIGINS=["http://localhost:5173"]
```

### Backend Architecture

- `app/main.py` — registers all routers
- `app/api/` — route handlers: auth, users, classrooms, attendance, sections (`sections.py`: ADMIN-only `/sections` list/create/rename/delete (delete only when empty) + per-section student add/edit/delete, profile, face enroll/delete; students have an optional email + password hash; shared logic in `app/services/enrollment.py`), users (`users.py`: admin-only create/list/read, password reset, `DELETE /users/{id}` for teachers with no classes), lectures (`lectures.py`: weekly timetable slots per class + role-aware `GET /lectures?weekday=N` schedule; admin-only `PATCH /lectures` `{moves:[{lecture_id, weekday, start_time, end_time}]}` moves several slots at once, all or nothing, 409 if a moved slot overlaps another of the same teacher; used by the drag-and-drop admin page `/admin/teachers/:id/schedule`, where a lab always takes two 50-min periods)
- `app/api/requests.py` — teacher requests to admins (`TeacherRequest`, kinds in `RequestKind`: face re-enroll, batch change, degree programme, NFC card, subject to add, schedule change, other). Teacher: `POST /requests`, `GET /requests/mine`, `DELETE /requests/{id}` (only while open). Admin: `GET /requests` (not fixed), `POST …/claim` ("Doing": status `in_progress`, other admins get 409), `…/release`, `…/resolve` (fixed). `GET /activity?days≤14` = `ActivityEvent` feed, written by `app/services/activity.py` on teacher/batch/subject/student add + remove and on a fixed request
- `app/api/account.py` — own account for staff (`/auth/password`, `/auth/logins`, `/auth/logout-others`) and students (same under `/student/...`). `token_version` on `User`/`Student` is put in tokens as `tv`; `deps.py` rejects a token whose `tv` is stale, so a password change, an admin password reset or "sign out of other devices" ends other sessions (the response carries a fresh token). `LoginEvent` rows are written on every successful login
- `app/models/` — SQLAlchemy ORM, typed `Mapped`/`mapped_column` style; `Lecture` = weekly slot (weekday 0=Mon, start/end time, room, `session_type` lecture|lab|tutorial; one of each kind per class per weekday; `PATCH /classrooms/{id}/lectures/{lid}` edits one); `User` (teachers) has a `department` (managed list, validated) and a `designation` (rank, one of `app/core/designations.py`, `GET /designations`); both set at create and via admin `PATCH /users/{id}` (a department change also updates their subjects). `POST /users` for a teacher may carry a `schedule` of `{classroom_id, weekday, start_time, end_time, room, session_type}` slots: those classes are given to the new teacher and their slots saved, all or nothing. `Classroom` also has `course_code`, `department` (copied from the teacher when not given), `programmes` (every degree programme the subject is allotted to, with an optional first year; `ClassroomProgramme` table, set at create and replaced as a whole via `PATCH {programmes}`; `degree_programme` mirrors the first) and `degree_programme` (one of `app/core/degree_programmes.py`, served by `GET /degree-programmes`; only programmes that have a batch-name letter, see `PROGRAMME_CODES`, letters from `GET /degree-programmes/codes`; `PROGRAMME_YEARS` limits a programme to some years of study, e.g. "3rd Year — Computer Science and Engineering DeraBassi" (letter `P`) only for batches starting with 3 or 4, `GET /degree-programmes/year-limits`), a nullable `teacher_id` (a subject can also exist with no teacher: omit it at `POST /classrooms`, admin only; `PATCH /classrooms/{id}` `{teacher_id}` assigns one, `{course, course_code}` rename it and moves the subject to that teacher's department) and a nullable `section_id` (a subject can exist with no batch yet: `POST /classrooms` with an empty `section`, admin only; teachers don't see it until an admin attaches a batch via `PATCH /classrooms/{id}` `{section}`), and `lecture_count` / `lab_count` / `tutorial_count` (sessions per week of each kind, 0–20, at least one above 0; default 1 lecture), read-only `credits` (1 per lecture and per lab, 0.5 per tutorial, per week), `category` (`core` | `elective`, default core; set at `POST /classrooms`, changed by admin `PATCH /classrooms/{id}`). Held sessions themselves are still untyped
- `app/schemas/` — Pydantic request/response shapes
- `app/services/s3_service.py` — private S3: session photos, student enrollment photos (`students/{roll}/`), presigned URLs. `S3_ENDPOINT_URL` / `S3_PUBLIC_ENDPOINT_URL` for local S3 (SeaweedFS)
- `app/services/face_recognition.py` — InsightFace `buffalo_l` (detect → embed → cosine match). `_decide` is the single accept/reject rule (`MATCH_THRESHOLD` 0.5, `AMBIGUITY_MARGIN` 0.05, untuned). A wrong match is worse than a miss. Model loads lazily (~280 MB download on first use); tests fake it
- `app/core/deps.py` — shared dependencies: `get_current_user`, `require_roles(*roles)`, `get_owned_classroom`
- `app/core/login_limiter.py` — in-memory failed-login throttle (5/email, 20/IP per 15 min → `429` + `Retry-After`); resets on restart; tests reset it via an autouse fixture
- `app/core/config.py` — settings via pydantic-settings + `.env`. Notable: `ENABLE_DOCS` (default true; EC2 sets false → no `/docs`), `ACCESS_TOKEN_EXPIRE_MINUTES` (480 default, 120 on EC2), `LOGIN_*` throttle limits

**Auth:** JWT Bearer. `POST /auth/login` → `access_token` + `role`; it checks `users` first, then `students` (email + password set by an admin; student tokens have subject `s:<id>` and role `student`, so they only work on `/student/*`, and staff tokens don't work there). Student portal API (`app/api/student_portal.py`): `GET /student/me`, `GET /student/overview` (their batch's classes + weekly lectures + their own attendance records). Student and staff emails can't clash (409). Two staff roles: `ADMIN` (all access), `TEACHER` (own classrooms only). Classroom ownership enforced in `deps.py` and inline in attendance router. `DELETE /classrooms/{id}` is admin-only and cascades to the class's lectures and saved attendance (the batch and its students stay).

**Attendance flow:** create session → upload photo → process (group photo, face recognition) → confirm records.

**Sections:** `Section` has a unique name (case-insensitive). It also has a `degree_programme` (from `GET /degree-programmes`, optional) and `start_year`/`end_year` (both or neither; with a programme the gap must equal its fixed length: 4 years, 2 for MCA, `PROGRAMME_DURATION`, `GET /degree-programmes/durations`, enforced on create and edit; the form fills the last year in and locks it), set at `POST /sections` and edited with `PATCH /sections/{id}`. A new batch's name must start with its year of study, from `start_year` and today (academic year July–June: a 2024 batch is year 3 from Jul 2026 to Jun 2027), enforced on create only; the name continues with the programme's letter(s) (3C23 = year 3 + Computer Engineering `C`; `MCA` for MCA), enforced on create when a programme is given; in year 1 the letter is A or B (common first-year groups) for every programme except AI & DS (`X`), CSBS (`R`) and MCA, which keep their own (`FIRST_YEAR_OWN_LETTER`, `GET /degree-programmes/first-year`); the add-batch form builds the name as digit + letters + the rest. `PATCH /sections/{id}` applies the same name, programme-year and length rules, but only to what is being changed (an untouched name keeps its old year digit after the July rollover). The batch page shows no student list. A class = a course taught to a section by a teacher; `POST /classrooms` takes the section *name* and reuses or creates the section. Admins may attach a class to any existing section; a teacher may only start a new section or add a class to one they already teach (otherwise `403`), because a section's students are shared by all its classes. Students belong to the **section**, so every class of a section shares the same students (any teacher of any class in that section sees them, and the face match works in all of them). Attendance sessions stay per class per day. **The roster is admin-managed**: only admins add students and enroll/delete faces, via `/sections` (below); teachers only list their class's students, verify faces and take attendance.

**Students (admin-managed):** `roll_number` = college roll no., unique college-wide. ADMIN only (teacher → `403`): `GET/POST /sections`, `GET/POST /sections/{id}/students`, `GET /sections/{id}/students/{sid}` (profile, presigned photos), `POST …/{sid}/face` (1–5 one-person photos → averaged embedding in Postgres + photos in S3; re-enroll replaces), `DELETE …/{sid}/face`. A student outside that section → `404`. The old classroom-scoped add/profile/enroll/delete endpoints are removed. Teachers/admins: `GET /classrooms/{id}/students` (list), `POST /classrooms/{id}/verify` → `verified`, `student`, `confidence`, `reason`.

**NFC cards:** `Student.nfc_uid` = the ID card's serial number (uppercase hex, no separators, unique; `normalize_nfc_uid` in `schemas/student.py` accepts `04:a2:…`). Admin: `PUT/DELETE /sections/{id}/students/{sid}/nfc` (409 if another student has the card); `StudentOut.nfc_linked`, profile has `nfc_uid`. Teacher: `POST /attendance/nfc?classroom_id=` `{uid}` → `{student_id, roll_number, name}` (404 not linked, 422 not in this class); it saves nothing, the attendance page marks the student present (method `nfc`) and `/confirm` saves it. Frontend reads cards with Web NFC (`lib/webNfc.js`, Chrome on Android, HTTPS or localhost only): `AttendanceSession/NfcTapPanel.jsx` (the "NFC Library Card" tab) and `components/admin/NfcCardLink.jsx` (admin student page; the number can also be typed). The dashboard's NFC tab (`pages/Dashboard`) reads cards the same way, collects the students tapped, and "Review & save" opens the attendance page with `location.state.nfcStudentIds`, which marks them present (method `nfc`) for the teacher to save. The card serial can be cloned, so it is a convenience, not proof of identity.

**One-face rule:** enroll and `/verify` use `extract_main_face`: exactly one face, or one whose box area is ≥ `DOMINANT_FACE_AREA_RATIO` (5, untuned) × the next largest; otherwise 422. `/process` (group photos) still uses every face.

**Tests:** model and S3 are faked (`fake_s3` fixture in `conftest.py`); no AWS or model download needed. 144 tests; Postgres must be running.

## Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint     # oxlint
```

### Frontend Architecture

- React 19, React Router v7, Vite
- `src/App.jsx` — all routes defined here
- `src/context/AuthContext.jsx` — real sign-in (`/auth/login`, `/auth/me`) and the route guards `TeacherArea` / `AdminArea`; `ClassroomContext.jsx` — the user's classes and the selected one; `schedule/ScheduleContext.jsx` — today's lectures from `GET /lectures`
- `src/context/TeacherDataContext.jsx` — for the teacher's classes: weekly lectures, saved attendance sessions + records, students (one load, shared). The teacher's Classes / Class Schedule pages read it through `hooks/useTeacherTimetable.js` (`context/teacherModel.js`), and the Reports pages through `pages/Reports/useReports.jsx` (`reportsData.js` computes every number from the saved sessions). The student portal builds its model from `GET /student/overview` (`context/students/useStudentModel.js` → `buildStudentModelFromApi`)
- `src/context/theme/ThemeContext.jsx` — light/dark theme
- `src/pages/` — one folder per route. `AttendanceSession/` (real flow: session → class photo → process → confirm, per-student verify), `Students/` (real roster + saved attendance per class), `Verify/`, `AdminPanel/` (admin area: Dashboard, Teachers (+ teacher page: reset password, assign classes, delayed permanent delete), Batches, Subjects, Students (each list has an Add button and clickable rows opening an add/edit page: `AdminStudentPage`, `AdminBatchPage`, `AdminSubjectPage`), Analytics, Settings), `Dashboard/`
- Admin dashboard: requests card (top left) + recent activity (bottom left, last 2 weeks) from `components/admin/DashboardFeeds.jsx` (polls 15 s / 30 s, "View more" windows), quick actions full height on the right. Teachers send requests from Settings → Requests (`pages/Settings/RequestsTab.jsx`)
- `src/api/` — fetch client (`client.js`: Bearer token, `ApiError`), `auth.js`, `classrooms.js`, `attendance.js`, `sections.js`, `lectures.js`, `users.js`. Base URL from `VITE_API_BASE_URL`
- `src/components/CameraCapture.jsx` — live camera capture (needs HTTPS or localhost); `lib/resizeImage.js` shrinks photos before upload

## Deployment (EC2)

Single EC2 instance (c7i-flex.large, Ubuntu 24.04) running Docker Compose with `docker-compose.ec2.yml`; photos in a private S3 bucket via the instance's IAM role (no keys); Caddy is the only public entry (80/443, automatic HTTPS for `APP_HOST`/`API_HOST`). Full guide: `docs/aws-deployment.md`. Update the server with `deployment/deploy.sh`; nightly DB dump with `deployment/backup.sh`.

- Region `ap-south-1`; AWS Free plan (credits, about $120 for 180 days), so **stop the instance when idle**. Resource ids are not in the repo.
- Gotchas: instance metadata hop limit must be 2 (containers can't read the role otherwise); `VITE_API_BASE_URL` is baked into the frontend at build time and `CORS_ALLOWED_ORIGINS` must match exactly; in Session Manager use `docker exec`, not `docker compose exec` (it hangs), and run `sudo -iu ubuntu` first.
- Current status and remaining steps: `claude/mvp-session-2026-10-18.md`.
