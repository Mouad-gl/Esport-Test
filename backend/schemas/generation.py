from datetime import datetime
from pydantic import BaseModel


class GenerationRequest(BaseModel):
    player_name: str
    team_name: str
    game: str
    region: str
    role: str | None = None
    game_tag: str | None = None


class GenerationOut(BaseModel):
    id: str
    player_id: str
    team_id: str
    status: str
    original_photo_url: str
    generated_image_url: str | None
    full_prompt_used: str | None
    quality_score: float | None
    quality_passed: bool | None
    quality_issues: str | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    # Resolved display names
    player_name: str | None = None
    team_name: str | None = None
    pose_name: str | None = None

    model_config = {"from_attributes": True}
