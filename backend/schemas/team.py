from datetime import datetime
from pydantic import BaseModel


class JerseyPromptOut(BaseModel):
    id: str
    team_id: str
    prompt_text: str
    jersey_description: str | None
    primary_color: str | None
    secondary_color: str | None
    accent_color: str | None
    design_style: str | None
    logo_placement: str | None
    sponsor_placement: str | None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: str
    name: str
    game: str
    region: str
    logo_url: str | None
    primary_color: str | None
    secondary_color: str | None
    has_jersey_prompt: bool
    player_count: int
    created_at: datetime
    jersey_prompt: JerseyPromptOut | None = None

    model_config = {"from_attributes": True}
