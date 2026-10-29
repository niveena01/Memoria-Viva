import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_TITLE: str = "Echoes of Code API"
    APP_VERSION: str = "1.0.0"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma2:2b"
    REQUEST_TIMEOUT: float = 60.0

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()