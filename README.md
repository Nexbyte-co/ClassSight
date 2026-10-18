# ClassSight

AI-assisted classroom attendance. A teacher uploads a classroom photo, face recognition proposes who is present, and the teacher reviews and confirms the result. The AI only suggests. The teacher makes the final decision.

> **Status: MVP in progress.** The backend API is complete and tested. The frontend login is wired to the API, but the dashboard, attendance, students, classes and reports screens still use mock data. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for details.

## Features

- **Classrooms and students:** teachers manage their own classrooms, and students are identified by a college-wide unique roll number.
- **Face enrollment:** each student is enrolled from 1–5 single-face photos, which are averaged into one embedding. Enrollment photos are stored in private S3.
- **Attendance sessions:** create a session, upload a group photo, run recognition, then confirm the records.
- **Single-photo verification:** check one captured photo against a classroom's enrolled students.
- **Cautious matching:** a match is accepted only above a similarity threshold and with a clear margin over the runner-up. A wrong match is treated as worse than a miss, so uncertain faces go to manual review.
- **Roles:** `ADMIN` has full access, and `TEACHER` can only access their own classrooms (JWT authentication).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Face recognition | InsightFace `buffalo_l` (detect, embed, cosine match) |
| Storage | Amazon S3 (SeaweedFS for local development) |
| Deployment | Docker Compose, AWS EC2 |

## Repository structure

```
backend/      FastAPI app, models, services, tests
frontend/     React + Vite app
database/     Schema docs and migrations
deployment/   Docker Compose, Dockerfiles, nginx config
docs/         SRS, HLD, LLD and diagrams
```

## Quick start

### Whole app with Docker

```bash
cd deployment
cp .env.example .env        # set JWT_SECRET_KEY (see the comment in the file)
docker compose up -d --build
docker exec -e SEED_ADMIN_EMAIL=you@school.edu classsight-backend python -m app.db.seed
```

- App: http://localhost
- API docs: http://localhost:8000/docs

The first start downloads the face model (about 280 MB), so allow a few minutes. See [deployment/README.md](deployment/README.md) for EC2 and configuration details.

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

## Testing

```bash
cd backend && pytest             # needs Postgres; the model and S3 are faked
cd frontend && npm run lint && npm run build
```

Backend tests need the `classsight_test` database. See [backend/README.md](backend/README.md) for setup.

## API overview

Interactive docs are served at `/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Users | `POST /users`, `GET /users`, `GET /users/me` |
| Classrooms | `GET/POST /classrooms`, `GET /classrooms/{id}`, `GET /classrooms/{id}/students` |
| Face enrollment | `POST/DELETE /classrooms/{id}/students/{sid}/face`, `GET /classrooms/{id}/students/{sid}` |
| Verification | `POST /classrooms/{id}/verify` |
| Attendance | `POST /attendance/session`, `/upload`, `/process`, `/confirm`; `GET /attendance/logs`, `/analytics` |

## Known limitations

- Match thresholds (`MATCH_THRESHOLD` 0.5, `AMBIGUITY_MARGIN` 0.05) are untuned and need evaluation on real classroom photos.
- Most frontend screens still use mock data.
- Browsers allow camera capture only over HTTPS or localhost, so camera use on EC2 needs a domain and TLS.

## Team

| Area | Owner | Notes |
|---|---|---|
| Frontend and UX | Parv Rawat | [README](README-Parv-Frontend-UX.md) |
| Backend and database | Guransh Rally | [README](README-Guransh-Backend-Database.md) |
| AI, NFC, AWS and DevOps | Manit Sharma | [README](README-Manit-AI-NFC-AWS-DevOps.md) |
