import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    game_tag: Mapped[str | None] = mapped_column(String(60))   # in-game alias
    role: Mapped[str | None] = mapped_column(String(60))       # e.g. IGL, AWPer, Support
    original_photo_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team: Mapped["Team"] = relationship("Team", back_populates="players")  # type: ignore[name-defined]
    generated_images: Mapped[list["GeneratedImage"]] = relationship("GeneratedImage", back_populates="player")  # type: ignore[name-defined]
