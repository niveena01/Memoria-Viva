from pydantic import BaseModel, Field

class SpiritQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000, description="The message or memory query whispered to the spirit.")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Creativity dial for the local model.")

class SpiritQueryResponse(BaseModel):
    response: str = Field(..., description="The spirit's poetic reply.")
    model: str = Field(..., description="The open-weight model used for inference.")
    tokens_eval: int | None = Field(default=None, description="Evaluation token count.")