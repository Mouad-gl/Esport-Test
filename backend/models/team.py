import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    primary_color: Mapped[str | None] = mapped_column(String(20))   # hex
    secondary_color: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jersey_prompt: Mapped["JerseyPrompt | None"] = relationship("JerseyPrompt", back_populates="team", uselist=False)
    players: Mapped[list["Player"]] = relationship("Player", back_populates="team")  # type: ignore[name-defined]
    generated_images: Mapped[list["GeneratedImage"]] = relationship("GeneratedImage", back_populates="team")  # type: ignore[name-defined]


class JerseyPrompt(Base):
    """Master visual identity for a team. Created once, reused forever."""
    __tablename__ = "jersey_prompts"
    __table_args__ = (UniqueConstraint("team_id", name="uq_jersey_team"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"), nullable=False)

    # The core prompt fragment injected into every generation for this team
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Human-readable summary of the jersey design
    jersey_description: Mapped[str] = mapped_column(Text)

    # Structured design metadata for auditing / editing
    primary_color: Mapped[str | None] = mapped_column(String(20))
    secondary_color: Mapped[str | None] = mapped_column(String(20))
    accent_color: Mapped[str | None] = mapped_column(String(20))
    design_style: Mapped[str | None] = mapped_column(String(80))   # e.g. "geometric", "gradient", "minimal"
    logo_placement: Mapped[str | None] = mapped_column(String(120))
    sponsor_placement: Mapped[str | None] = mapped_column(String(120))
    jersey_notes: Mapped[str | None] = mapped_column(Text)          # any special instructions

    version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team: Mapped["Team"] = relationship("Team", back_populates="jersey_prompt")
    generated_images: Mapped[list["GeneratedImage"]] = relationship("GeneratedImage", back_populates="jersey_prompt")  # type: ignore[name-defined]
