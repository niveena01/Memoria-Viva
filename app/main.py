from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import spirit

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
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include Routers
    app.include_router(spirit.router)

    @app.get("/", tags=["Health Check"])
    async def root_health():
        return {
            "status": "online",
            "message": "The digital ofrenda is glowing. Local AI runtime is standing by.",
            "model": settings.OLLAMA_MODEL
        }

    return app

app = create_application()