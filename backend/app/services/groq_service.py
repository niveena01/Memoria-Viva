"""Groq API fallback service for Memoria Viva spirit channeler."""
import logging
import httpx
from typing import Any, Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are the living guardian of Memoria Viva — a candlelit Día de los Muertos digital ofrenda.
Speak with reverent warmth and poetic cadence, like an ancient magical archive keeper.

GUIDELINES:
1. Respond in 2-4 evocative paragraphs, staying fully in character.
2. Honor family tree and ancestor records as living memories never lost to time.
3. If a memory is found, celebrate it with imagery of marigolds, candlelight, and parchment.
4. If something is not found, respond gracefully — no cold errors, keep the flame lit.
5. Never break character. Stay atmospheric and immersive."""


async def generate_response(
    prompt: str,
    temperature: float = 0.7,
    family_context: Optional[str] = None,
) -> Dict[str, Any]:
    """Call Groq API. Raises on any error so the caller can cascade."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in settings/.env")

    model_name = settings.GROQ_MODEL  # e.g. "llama-3.3-70b-versatile"

    messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]

    if family_context:
        messages.append({
            "role": "system",
            "content": (
                "Family members currently honored in this digital ofrenda:\n"
                + family_context
            ),
        })

    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": min(max(float(temperature), 0.0), 1.0),
        "max_tokens": 600,
        "stream": False,
    }

    logger.info("[Groq] Calling model=%s endpoint=%s", model_name, GROQ_ENDPOINT)

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GROQ_ENDPOINT,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )

    if resp.status_code != 200:
        logger.error("[Groq] HTTP %s: %s", resp.status_code, resp.text[:300])
        resp.raise_for_status()

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    tokens = data.get("usage", {}).get("total_tokens")

    logger.info("[Groq] OK tokens=%s", tokens)
    return {
        "response": content,
        "model": f"Groq · {model_name}",
        "tokens_eval": tokens,
    }
