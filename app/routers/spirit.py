from fastapi import APIRouter, Depends
from app.schemas import SpiritQueryRequest, SpiritQueryResponse
from app.services.ollama_service import ollama_service

router = APIRouter(prefix="/api/v1/spirit", tags=["Spirit Channeler"])

@router.post("/channel", response_model=SpiritQueryResponse)
async def channel_spirit(payload: SpiritQueryRequest):
    """
    Sends a query to the local Gemma 2 2B model via Ollama and returns the spirit's response.
    """
    result = await ollama_service.generate_response(
        prompt=payload.prompt,
        temperature=payload.temperature
    )
    return SpiritQueryResponse(**result)