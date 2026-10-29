import httpx
from fastapi import HTTPException, status
from app.config import settings

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def generate_response(self, prompt: str, temperature: float) -> dict:
        url = f"{self.base_url}/api/generate"
        
        # System prompt setting the spooky/melancholic Día de los Muertos persona
        system_persona = (
            "You are the 'Spirit of the Archive', a poetic, wise, and slightly eerie digital presence "
            "honoring memories, ancestors, and forgotten code. Answer in a warm, atmospheric tone blending "
            "the spirit of Día de los Muertos with historical preservation. Keep answers concise."
        )

        payload = {
            "model": self.model,
            "prompt": f"{system_persona}\n\nWhisper from the living: {prompt}",
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_ctx": 2048  # Optimized memory window for 8GB RAM systems
            }
        }

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return {
                    "response": data.get("response", "The spirit remains silent..."),
                    "model": self.model,
                    "tokens_eval": data.get("eval_count", 0)
                }
            except httpx.ConnectError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Ollama is offline. Ensure Ollama is running locally on your machine."
                )
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="The local model took too long to respond."
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"An unexpected error occurred: {str(e)}"
                )

ollama_service = OllamaService()