from pydantic import BaseModel, Field
from typing import Optional, List

class SpiritQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000, description="The message or memory query whispered to the spirit.")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Creativity dial for the local model.")

class FamilyMember(BaseModel):
    name: str = Field(..., description="Full name of the family member")
    born_year: int = Field(default=0, description="Year of birth")
    death_year: Optional[int] = Field(default=None, description="Year of death, if applicable")
    image_url: Optional[str] = Field(default="/no_image.png", description="Portrait image URL")
    relationship: Optional[str] = Field(default=None, description="Relationship label e.g. Mother, Daughter, Grandmother")
    generation: Optional[int] = Field(default=None, description="Hierarchy level: 1=grandparents, 2=parents, 3=children")

    class Config:
        populate_by_name = True

class SpiritQueryResponse(BaseModel):
    response: str = Field(..., description="The spirit's poetic reply.")
    model: str = Field(..., description="The model used for inference.")
    tokens_eval: int | None = Field(default=None, description="Evaluation token count.")
    family_data: Optional[List["FamilyMember"]] = Field(default=None, description="Optional family tree members for in-chat display")

class FamilyTreeResponse(BaseModel):
    family: List[FamilyMember] = Field(..., description="Processed list of family members")

class AncestralEvent(BaseModel):
    year: int = Field(..., description="Year of the event")
    season: str = Field(..., description="Season of the event")
    documents_archived: int = Field(..., description="Number of documents archived")
    letters_exchanged: int = Field(..., description="Number of letters exchanged")
    anomaly_score_log: float = Field(..., description="Log of anomaly score")
    target: str = Field(..., description="Event classification (e.g., Peaceful, Turbulent)")

class AncestralTimelineResponse(BaseModel):
    events: List[AncestralEvent] = Field(..., description="List of parsed ancestral timeline events")
