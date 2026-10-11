from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import attendance, auth, classrooms, users
from app.core.config import get_settings

app = FastAPI(title="ClassSight API")

settings = get_settings()
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
