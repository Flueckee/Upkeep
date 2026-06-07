import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, bikes, components, logs, intervals, photos, comments, export, users

app = FastAPI(title="Upkeep API", version="0.1.0")

# Allow all origins in development.
# In production set CORS_ORIGINS to a comma-separated list of allowed origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bikes.router)
app.include_router(components.router)
app.include_router(logs.router)
app.include_router(intervals.router)
app.include_router(photos.router)
app.include_router(comments.router)
app.include_router(export.router)
app.include_router(users.router)

# Serve uploaded media files under /media
_upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_upload_dir)), name="media")


@app.get("/health")
def health():
    return {"status": "ok"}
