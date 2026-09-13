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

## Run

```bash
uvicorn app.main:app --reload
```

## Test

```bash
pytest
```

Tests run against a real PostgreSQL database (`DATABASE_URL`, defaulting to a
`classsight_test` database) and drop/recreate all tables around each test.
