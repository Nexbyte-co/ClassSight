# ClassSight Backend

FastAPI backend service: authentication, classroom/student management, and
attendance session upload/process/confirm/logs/analytics.

## Setup

```bash
python -m venv venv
./venv/Scripts/activate   # or `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and adjust `DATABASE_URL` / `JWT_SECRET_KEY` for
your environment.

## Database migrations

Migrations are managed with Alembic (`alembic.ini`, `migrations/`).

```bash
alembic upgrade head        # apply all migrations
alembic revision --autogenerate -m "describe change"   # after editing app/models
alembic downgrade -1         # roll back one revision
```

## First admin account

A fresh database has no users, so create one to log in with:

```bash
SEED_ADMIN_EMAIL=you@school.edu python -m app.db.seed
```

Set `SEED_ADMIN_PASSWORD` to choose the password; otherwise a random one is
printed once. Re-running is a no-op for an existing email.

## Run

```bash
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```

Tests run against a real PostgreSQL database (`DATABASE_URL`, defaulting to
`postgresql+psycopg://classsight:classsight@localhost:5432/classsight_test`) and
drop/recreate all tables around each test. `deployment/docker-compose.yml`
creates `classsight_test` the first time its volume is initialised; on an older
volume, create it once:

```bash
docker exec classsight-postgres psql -U classsight -d classsight -c "CREATE DATABASE classsight_test"
```
