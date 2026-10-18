import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import attendance, auth, classrooms, users
from app.core.config import get_settings

settings = get_settings()

# App loggers only; images and embeddings are never logged, only counts/scores/keys.
logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("app").setLevel(settings.log_level.upper())

app = FastAPI(title="ClassSight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(classrooms.router)
app.include_router(attendance.router)


@app.get("/")
def read_root():
    return {"message": "FastAPI Backend Initialized"}


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
