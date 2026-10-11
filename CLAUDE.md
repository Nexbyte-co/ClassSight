# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI classroom attendance. Teachers manage classrooms, upload photos, face recognition identifies students. Frontend login wired to API; all data screens still mock. Backend API complete + tested.

## Structure

```
backend/    FastAPI + Python
frontend/   React + Vite (JS)
database/   Schema docs
deployment/ Docker Compose (Postgres only)
```

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload        # http://localhost:8000
# API docs: http://localhost:8000/docs
```

**Postgres via Docker:**
```bash
docker compose -f deployment/docker-compose.yml up -d
alembic upgrade head
```

**Tests** — need Postgres at `postgresql+psycopg://classsight:classsight@localhost:5432/classsight_test`. `conftest.py` drops/creates schema per test.

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
- `app/api/` — route handlers: auth, users, classrooms, attendance
- `app/models/` — SQLAlchemy ORM, typed `Mapped`/`mapped_column` style
- `app/schemas/` — Pydantic request/response shapes
- `app/services/s3_service.py` — S3 photo upload
- `app/services/face_recognition.py` — **stub**, returns no matches; real AI integration pending
- `app/core/deps.py` — shared dependencies: `get_current_user`, `require_roles(*roles)`, `get_owned_classroom`
- `app/core/config.py` — settings via pydantic-settings + `.env`

**Auth:** JWT Bearer. `POST /auth/login` → `access_token`. Two roles: `ADMIN` (all access), `TEACHER` (own classrooms only). Classroom ownership enforced in `deps.py` and inline in attendance router.

**Attendance flow:** create session → upload photo → process (calls face recognition stub) → confirm records.

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
- `src/context/AttendanceContext.jsx` — global state for active session; verified/unverified student lists; persisted to `localStorage`
- `src/context/ThemeContext.jsx` — light/dark theme
- `src/pages/` — one file per route
- `src/api/` — fetch client (`client.js`: Bearer token from localStorage, `ApiError`), `auth.js`, `classrooms.js`. Base URL from `VITE_API_BASE_URL`
- `src/components/RequireAuth.jsx` — route guard (token presence only); wraps all routes except `/` + `/login`
- `src/data/mockAttendance.js`, `mockStudents.js` — **dashboard/attendance/students/classes/reports data still mock**; only login hits API

`AttendanceContext` is primary shared state. `resolveStudent(id, method)` moves student from unverified → verified with method label (`"ai"`, `"nfc"`, `"manual"`).
