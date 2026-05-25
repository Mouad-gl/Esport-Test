import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Pose(Base):
    __tablename__ = "poses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # FPS, MOBA, BR (Battle Royale), RTS, General — used to filter by game type
    game_type: Mapped[str] = mapped_column(String(40), default="General")
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    generated_images: Mapped[list["GeneratedImage"]] = relationship("GeneratedImage", back_populates="pose")  # type: ignore[name-defined]
