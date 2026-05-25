"""
Pose library management and random pose selection.
Poses can be filtered by game type for better contextual match.
"""
import random
from sqlalchemy.orm import Session
from backend.models.pose import Pose

_GAME_TYPE_MAP = {
    "cs2": "FPS", "csgo": "FPS", "valorant": "FPS",
    "league of legends": "MOBA", "dota 2": "MOBA",
    "apex legends": "BR", "fortnite": "BR",
    "overwatch": "General", "rocket league": "General",
}


def game_to_type(game: str) -> str:
    return _GAME_TYPE_MAP.get(game.strip().lower(), "General")


def pick_random_pose(db: Session, game: str) -> Pose | None:
    """
    Return a random active pose. Prefer game-specific poses, fall back to General.
    """
    game_type = game_to_type(game)
    candidates = (
        db.query(Pose)
        .filter(Pose.is_active == True, Pose.game_type == game_type)  # noqa: E712
        .all()
    )
    if not candidates:
        candidates = (
            db.query(Pose)
            .filter(Pose.is_active == True)  # noqa: E712
            .all()
        )
    return random.choice(candidates) if candidates else None


def list_poses(db: Session) -> list[Pose]:
    return db.query(Pose).filter(Pose.is_active == True).order_by(Pose.game_type, Pose.name).all()  # noqa: E712
