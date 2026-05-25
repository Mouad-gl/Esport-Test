"""
Team existence logic and jersey prompt management.

Rule: once a JerseyPrompt is saved for a team, it is immutable for generation.
      It can only be manually updated via the admin API (bumps version).
"""
import re
from sqlalchemy.orm import Session
from backend.models.team import Team, JerseyPrompt
from backend.services.prompt_builder import build_jersey_prompt


def normalise_team_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def get_or_create_team(
    db: Session,
    team_name: str,
    game: str,
    region: str,
) -> tuple[Team, bool]:
    """
    Returns (team, was_created).
    Lookup is case-insensitive on the normalised name.
    """
    norm = normalise_team_name(team_name)

    # Search all teams and compare normalised
    existing = db.query(Team).all()
    for t in existing:
        if normalise_team_name(t.name) == norm:
            return t, False

    team = Team(name=team_name.strip(), game=game.strip(), region=region.strip())
    db.add(team)
    db.flush()  # get the ID without committing
    return team, True


def ensure_jersey_prompt(db: Session, team: Team) -> JerseyPrompt:
    """
    Load the saved jersey prompt for a team, or generate and save a new one.
    This is the heart of the Team Identity Memory feature.
    """
    # Always query directly — the relationship cache may be stale after flush/commit
    existing = db.query(JerseyPrompt).filter(JerseyPrompt.team_id == team.id).first()
    if existing:
        return existing

    prompt_text, description, metadata = build_jersey_prompt(
        team_name=team.name,
        game=team.game,
        region=team.region,
    )

    jersey = JerseyPrompt(
        team_id=team.id,
        prompt_text=prompt_text,
        jersey_description=description,
        primary_color=metadata.get("primary_color"),
        secondary_color=metadata.get("secondary_color"),
        accent_color=metadata.get("accent_color"),
        design_style=metadata.get("design_style"),
        logo_placement=metadata.get("logo_placement"),
        sponsor_placement=metadata.get("sponsor_placement"),
        jersey_notes=metadata.get("jersey_notes"),
    )
    db.add(jersey)
    db.flush()
    return jersey


def get_team_with_jersey(db: Session, team_id: str) -> Team | None:
    return db.query(Team).filter(Team.id == team_id).first()


def list_teams(db: Session) -> list[Team]:
    return db.query(Team).order_by(Team.name).all()
