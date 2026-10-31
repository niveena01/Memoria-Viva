# backend\app\main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import spirit, timeline

def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_TITLE,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Configure CORS for local frontend integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount static files
    import os
    from fastapi.staticfiles import StaticFiles
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Include Routers
    app.include_router(spirit.router)
    app.include_router(timeline.router)

    @app.get("/", tags=["Health Check"])
    async def root_health():
        return {
            "status": "online",
            "message": "The digital ofrenda for Memoria Viva is glowing. Local AI runtime is standing by.",
            "model": settings.OLLAMA_MODEL
        }

    return app

app = create_application()