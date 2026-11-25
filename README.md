# ClassSight

AI-assisted classroom attendance. A teacher uploads a classroom photo, face recognition proposes who is present, and the teacher reviews and confirms the result. The AI only suggests. The teacher makes the final decision.

> **Status: MVP, deployed for demo.** The backend API is complete and tested, and every screen (teacher, admin and student) reads from the API. Not yet exercised on real classroom photos: the face-match thresholds (see [Known limitations](#known-limitations)).

## Features

**Teachers**
- **Dashboard:** today's lectures and live attendance numbers.
- **Attendance sessions:** create a session, upload or capture a group photo, run recognition, review each student (present, needs review, absent), then confirm the records. Each day's record can be downloaded as CSV (one day or all days).
- **Single-photo verification:** check one captured photo against a classroom's enrolled students.
- **NFC attendance:** tap a student's ID card to mark them present (Chrome on Android; see [NFC](#nfc)).
- **Classes, schedule and reports:** their classes, a weekly timetable, attendance reports and report details.
- **Roster:** read-only list of the students in their classes.
- **Requests:** ask the admins for a change (face re-enroll, batch change, degree programme, NFC card, subject to add, schedule change, other).

**Admins**
- **Roster management:** add, edit and delete students (college-wide unique roll number); enroll or delete faces (1 to 5 single-face photos, averaged into one embedding, photos kept in private S3); link or unlink an NFC card.
- **Structure:** batches (sections) with degree programme and years, sub-batches, departments, designations, subjects (core or elective, lecture/lab/tutorial counts), teachers, and drag-and-drop timetable slots.
- **Dashboard:** open teacher requests (claim, release, resolve) and a recent-activity feed.
- **Accounts:** create teachers, reset passwords, delete teachers who have no classes. The first admin is seeded from the command line.

**Students**
- **Student portal** (`/student`): dashboard, timetable, courses, attendance reports and settings. Students sign in at `/login` with the email and password an admin set.

**Everyone**
- **Roles:** `ADMIN` (full access), `TEACHER` (own classrooms only), `STUDENT` (own data only), with JWT authentication.
- **Account security:** change password, login history, and "sign out of other devices". Failed logins are throttled.
- **Cautious matching:** a match is accepted only above a similarity threshold and with a clear margin over the runner-up. A wrong match is treated as worse than a miss, so uncertain faces go to manual review.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite, Lucide icons, Oxlint |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT bearer (HS256), bcrypt |
| Face recognition | InsightFace `buffalo_l` (detect, embed, cosine match) |
| Storage | Amazon S3 (SeaweedFS for local development) |
| Deployment | Docker Compose, AWS EC2 with Caddy (automatic HTTPS) |
| Tests | Pytest and HTTPX, about 180 backend tests; no frontend tests |

## Repository structure

```
backend/      FastAPI app (api, models, schemas, services, core), Alembic migrations, tests, e2e scripts
frontend/     React + Vite app (api client, contexts, pages, components)
database/     Schema docs and migrations
deployment/   Docker Compose, EC2 override, Dockerfiles, nginx and Caddy config, deploy.sh, backup.sh
docs/         SRS, HLD, LLD and diagrams; aws-deployment.md (EC2 guide); e2e-verification.md (face test report)
```

## Architecture

```
Browser (React)  -->  FastAPI  -->  PostgreSQL 16
                          |-->  S3 (photos, presigned URLs)
                          '-->  InsightFace (loads lazily, ~280 MB on first use)
```

**Data model**
- A **section** (batch) has a unique, case-insensitive name. Students belong to the section, so every class of that section shares the same students.
- A **classroom** (class) is a course taught to a section by a teacher. `POST /classrooms` takes the section name and reuses or creates it. A teacher may only start a new section or add a class to one they already teach.
- A **lecture** is a weekly slot (weekday 0 = Monday, start and end time, room, session type). A class can have several slots a day; the end must be after the start.
- Attendance sessions are per class per day. Records are present, needs review or absent; the API stores only the match confidence, so AI versus manual is inferred from it after a reload.
- `roll_number` is the college roll number, unique college-wide.

**Attendance flow:** create session, upload photo, process (group photo, face recognition), review, confirm records.

### Face recognition
- `_decide` is the single accept or reject rule: `MATCH_THRESHOLD` 0.5 and `AMBIGUITY_MARGIN` 0.05 (both untuned).
- Enrollment and `/verify` need exactly one face, or one whose box area is at least 5 times the next largest (`DOMINANT_FACE_AREA_RATIO`); otherwise `422`. `/process` (group photos) uses every face.
- End-to-end check on 5 students: no wrong matches and no false accepts, but too few people to tune the thresholds. See [docs/e2e-verification.md](docs/e2e-verification.md).

### NFC
An admin links a student's card serial number (uppercase hex, unique). A teacher taps the card on the attendance page; the API returns the student only if they belong to that class, and the page saves the mark on confirm. It uses the Web NFC API, so it works only in Chrome on Android with NFC on, over HTTPS or localhost. A card serial can be cloned, so NFC is a convenience, not proof of identity.

## Quick start

### Whole app with Docker

```bash
cd deployment
cp .env.example .env        # set JWT_SECRET_KEY (see the comment in the file)
docker compose up -d --build
docker compose ps           # wait for the backend to be (healthy)
docker exec -e SEED_ADMIN_EMAIL=you@school.edu -e SEED_ADMIN_PASSWORD='choose-one' classsight-backend python -m app.db.seed
```

- App: http://localhost
- API docs: http://localhost:8000/docs

The first start downloads the face model (about 280 MB), so allow a few minutes. Migrations run when the backend starts. Use a real-looking email domain for accounts: reserved ones such as `.local` are rejected. If you leave out `SEED_ADMIN_PASSWORD`, a random one is printed once. See [deployment/README.md](deployment/README.md) for configuration.

### Local development

Start Postgres only, then run the backend and frontend directly.

```bash
# Database
docker compose -f deployment/docker-compose.yml up -d     # no profiles = Postgres only

# Backend (http://localhost:8000)
cd backend
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
SEED_ADMIN_EMAIL=you@school.edu python -m app.db.seed     # creates the first admin
uvicorn app.main:app --reload

# Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Main settings (`backend/.env`): `DATABASE_URL`, `JWT_SECRET_KEY`, `S3_BUCKET_NAME`, `AWS_REGION`, `CORS_ALLOWED_ORIGINS`, `ENABLE_DOCS`, `ACCESS_TOKEN_EXPIRE_MINUTES` (480 by default), `LOGIN_*` throttle limits and `ENROLL_AUGMENT` (off).

## Testing

```bash
cd backend && pytest             # needs Postgres; the model and S3 are faked
cd frontend && npm run lint && npm run build
```

Backend tests need the `classsight_test` database. See [backend/README.md](backend/README.md) for setup.

## API overview

Interactive docs are served at `/docs` (turned off on EC2). Staff and student sign-in share `POST /auth/login`.

| Area | Endpoints |
|---|---|
| Auth and account | `POST /auth/login`, `GET /auth/me`, `POST /auth/password`, `GET /auth/logins`, `POST /auth/logout-others` |
| Users (admin) | `GET/POST /users`, `GET/PATCH/DELETE /users/{id}`, `PUT /users/{id}/password`, `GET /users/me` |
| Classrooms | `GET/POST /classrooms`, `GET/PATCH/DELETE /classrooms/{id}`, `GET /classrooms/{id}/students`, `GET /classrooms/{id}/students/{sid}/photo` |
| Lectures | `GET/POST /classrooms/{id}/lectures`, `PATCH/DELETE /classrooms/{id}/lectures/{lid}`, `GET/PATCH /lectures` |
| Sections and roster (admin) | `GET/POST /sections`, `PATCH/DELETE /sections/{id}`, `GET/POST /sections/{id}/students`, `GET/PATCH/DELETE /sections/{id}/students/{sid}` |
| Face enrollment (admin) | `POST/DELETE /sections/{id}/students/{sid}/face` |
| NFC | `PUT/DELETE /sections/{id}/students/{sid}/nfc` (admin), `POST /attendance/nfc` (teacher) |
| Verification | `POST /classrooms/{id}/verify` |
| Attendance | `POST /attendance/session`, `/upload`, `/process`, `/confirm`; `GET /attendance/logs` |
| Requests and activity | `GET/POST /requests`, `GET /requests/mine`, `DELETE /requests/{id}`, `POST /requests/{id}/claim`, `/release`, `/resolve`, `GET /request-kinds`, `GET /activity` |
| Reference data | `GET/POST /departments`, `GET /designations`, `GET /degree-programmes` (plus `/codes`, `/first-year`, `/year-limits`, `/durations`) |
| Student portal | `GET /student/me`, `/student/me/photo`, `/student/overview`, `/student/logins`; `POST /student/password`, `/student/logout-others` |
| Health | `GET /health` |

## Deployment (AWS EC2)

- One EC2 instance (c7i-flex.large, Ubuntu 24.04) runs Docker Compose with `docker-compose.yml` plus `docker-compose.ec2.yml`, in region `ap-south-1`.
- Photos go to a private S3 bucket through the instance's IAM role (no access keys).
- **Caddy** is the only public entry (ports 80 and 443) with automatic HTTPS for `APP_HOST` and `API_HOST`. Port 8000 is not published. Browsers allow the camera only over HTTPS, which is why a domain is used.
- `deployment/.env` on the instance: `COMPOSE_PROFILES=app`, strong `JWT_SECRET_KEY` and `POSTGRES_PASSWORD`, `APP_HOST`, `API_HOST`, `VITE_API_BASE_URL=https://<API_HOST>`, `CORS_ALLOWED_ORIGINS=["https://<APP_HOST>"]`, `S3_BUCKET_NAME`, `AWS_REGION`.
- EC2 defaults (set in `docker-compose.ec2.yml`): API docs off, 2-hour sessions.

**Update the server** (in Session Manager, run `sudo -iu ubuntu` first):

```bash
cd ~/ClassSight/deployment
git checkout <branch>
./deploy.sh        # git pull --ff-only, compose up -d --build, prune, ps
```

**Roll back:** take a database dump first, then check out the previous branch or commit and run `./deploy.sh` again.

```bash
docker exec classsight-postgres pg_dump -U classsight classsight | gzip > ~/backup.sql.gz
```

**Backups:** `deployment/backup.sh` dumps Postgres to `s3://<bucket>/backups/` (nightly cron, 14-day lifecycle rule on the bucket).

**Gotchas**
- The instance metadata hop limit must be 2, or containers cannot read the IAM role.
- `VITE_API_BASE_URL` is baked into the frontend at build time, and `CORS_ALLOWED_ORIGINS` must match the app address exactly. Rebuild the frontend after changing either.
- In Session Manager use `docker exec`, not `docker compose exec` (it hangs).
- The AWS Free plan runs on credits (about 180 days), so stop the instance when idle.

Full step-by-step guide: [docs/aws-deployment.md](docs/aws-deployment.md).

## Known limitations

- Match thresholds (`MATCH_THRESHOLD` 0.5, `AMBIGUITY_MARGIN` 0.05) are untuned and need evaluation on real classroom photos.
- Browsers allow camera capture only over HTTPS or localhost, so camera use on EC2 needs a domain and TLS.
- NFC reading works only in Chrome on Android; it has backend tests but has not been tried with a real card.
- The failed-login throttle is in memory and resets on restart.
- No frontend tests and no CI workflows.

## Team

| Area | Owner |
|---|---|
| Frontend and UX | Parv Rawat |
| Backend and database | Guransh Rally |
| AI, NFC, AWS and DevOps | Manit Sharma |
