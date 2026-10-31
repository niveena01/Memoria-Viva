# backend\app\config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class Settings(BaseSettings):
    APP_TITLE: str = "Memoria Viva API"
    APP_VERSION: str = "1.0.0"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:1b"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    REQUEST_TIMEOUT: float = 60.0

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

tabpfn_key = os.getenv("TABPFN_TOKEN") or os.getenv("TABPFN_API_KEY")
if tabpfn_key:
    os.environ["TABPFN_TOKEN"] = tabpfn_key