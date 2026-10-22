# ClassSight backend: FastAPI + InsightFace (CPU).
# Build:  docker build -t classsight-backend backend/

# ---- build stage: compile wheels (insightface ships C extensions) ----
FROM python:3.13-slim-bookworm AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r /tmp/requirements.txt

# ---- runtime stage: no compilers ----
FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/app

# libgomp1: OpenMP runtime used by onnxruntime / opencv.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 app

COPY --from=build /wheels /wheels
# insightface pulls in the GUI build of OpenCV (needs X11 libs), which shadows
# the headless build from requirements.txt; keep only the headless one.
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/*.whl \
    && pip uninstall -y opencv-python \
    && pip install --no-cache-dir --no-index --find-links=/wheels --force-reinstall --no-deps \
        /wheels/opencv_python_headless-*.whl \
    && rm -rf /wheels

WORKDIR /app
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app migrations ./migrations
COPY --chown=app:app app ./app
COPY --chown=app:app docker-entrypoint.sh ./

# Model weights (~280 MB) are downloaded here on first start; mount a volume
# so they survive container rebuilds.
RUN mkdir -p /home/app/.insightface && chown app:app /home/app/.insightface
VOLUME ["/home/app/.insightface"]

USER app
EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
