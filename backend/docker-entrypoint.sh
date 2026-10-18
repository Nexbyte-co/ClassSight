#!/bin/sh
# Container start: migrate, optionally warm the face model, then serve.
set -eu

echo "entrypoint: applying database migrations"
alembic upgrade head

if [ "${PRELOAD_MODEL:-true}" = "true" ]; then
    # First start downloads the weights into the mounted volume; later starts
    # only load them. Doing it here keeps the first enrollment request fast.
    echo "entrypoint: loading face recognition model"
    python -c "from app.services.face_recognition import _get_model; _get_model()"
fi

echo "entrypoint: starting API"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
