import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"), nullable=False)
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"), nullable=False)
    pose_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("poses.id"))
    jersey_prompt_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jersey_prompts.id"))

    original_photo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    generated_image_url: Mapped[str | None] = mapped_column(String(500))

    # Full prompt sent to Nano Banana 2 — stored for debugging and reproducibility
    full_prompt_used: Mapped[str | None] = mapped_column(Text)

    # Quality gate results
    quality_score: Mapped[float | None] = mapped_column(Float)
    quality_passed: Mapped[bool | None] = mapped_column(Boolean)
    quality_issues: Mapped[str | None] = mapped_column(Text)   # JSON array stored as string

    # Generation lifecycle
    status: Mapped[str] = mapped_column(String(20), default="pending")
    # pending | processing | completed | failed | quality_failed
    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    player: Mapped["Player"] = relationship("Player", back_populates="generated_images")  # type: ignore[name-defined]
    team: Mapped["Team"] = relationship("Team", back_populates="generated_images")  # type: ignore[name-defined]
    pose: Mapped["Pose | None"] = relationship("Pose", back_populates="generated_images")
    jersey_prompt: Mapped["JerseyPrompt | None"] = relationship("JerseyPrompt", back_populates="generated_images")  # type: ignore[name-defined]
