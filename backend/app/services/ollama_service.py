"""Local Ollama service for Memoria Viva spirit channeler."""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class OllamaService:
    """Attempts to call the local Ollama HTTP server.

    Raises httpx.ConnectError / httpx.TimeoutException / httpx.HTTPStatusError
    so the router can cascade to Groq without needing to catch generic Exception.
    """

    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL  # e.g. "gemma3:1b"

    async def generate_response(self, prompt: str, temperature: float = 0.7) -> dict:
        endpoint = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": float(temperature)},
        }

        logger.info("[Ollama] POST %s model=%s", endpoint, self.model)

        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            resp = await client.post(endpoint, json=payload)

        if resp.status_code != 200:
            logger.warning("[Ollama] HTTP %s: %s", resp.status_code, resp.text[:200])
            resp.raise_for_status()

        data = resp.json()
        response_text = data.get("response", "").strip()

        if not response_text:
            raise ValueError("[Ollama] Empty response from model")

        logger.info("[Ollama] OK eval_count=%s", data.get("eval_count"))
        return {
            "response": response_text,
            "model": f"Ollama · {self.model}",
            "tokens_eval": data.get("eval_count"),
        }


ollama_service = OllamaService()