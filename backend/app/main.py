from fastapi import FastAPI

from app.api import attendance, auth, classrooms, users

app = FastAPI(title="ClassSight API")

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
