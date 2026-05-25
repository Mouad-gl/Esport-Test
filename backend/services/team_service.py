import re
from sqlalchemy.orm import Session
from backend.models.team import Team, JerseyPrompt
from backend.services.prompt_builder import build_jersey_prompt


def normalise_team_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def get_or_create_team(db: Session, team_name: str) -> tuple[Team, bool]:
    """Returns (team, was_created). Lookup is case-insensitive."""
    norm = normalise_team_name(team_name)
    for t in db.query(Team).all():
        if normalise_team_name(t.name) == norm:
            return t, False

    team = Team(name=team_name.strip())
    db.add(team)
    db.flush()
    return team, True


def ensure_jersey_prompt(db: Session, team: Team, logo_url: str | None = None) -> JerseyPrompt:
    """
    Load the saved jersey prompt for a team, or generate and save a new one.
    Team Identity Memory: once saved, the jersey prompt is never regenerated.
    """
    existing = db.query(JerseyPrompt).filter(JerseyPrompt.team_id == team.id).first()
    if existing:
        return existing

    prompt_text, description, metadata = build_jersey_prompt(
        team_name=team.name,
        logo_url=logo_url,
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


def list_teams(db: Session) -> list[Team]:
    return db.query(Team).order_by(Team.name).all()
