from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path

from backend.database import create_tables, SessionLocal
from backend.seeds.poses import seed_poses
from backend.api import generate, teams, players

app = FastAPI(
    title="AI Esports Photoshoot Engine",
    description=(
        "Turns normal player photos into professional esports media-day portraits. "
        "Team Identity Memory ensures every player from the same team always wears the same jersey."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(generate.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(players.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    create_tables()
    db = SessionLocal()
    try:
        added = seed_poses(db)
        if added:
            print(f"[startup] Seeded {added} poses.")
    finally:
        db.close()

    # Ensure upload dirs exist
    from backend.config import settings
    settings.upload_originals_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_generated_dir.mkdir(parents=True, exist_ok=True)


# Serve uploaded files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve frontend
frontend_dir = Path("frontend")
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory="frontend"), name="static")

    @app.get("/", include_in_schema=False)
    def serve_frontend():
        return FileResponse("frontend/index.html")
