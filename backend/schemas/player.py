from datetime import datetime
from pydantic import BaseModel


class PlayerOut(BaseModel):
    id: str
    team_id: str
    name: str
    game_tag: str | None
    role: str | None
    original_photo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
