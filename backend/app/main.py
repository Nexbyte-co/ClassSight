from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def read_root():
    return {"message": "FastAPI Backend Initialized"}

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }