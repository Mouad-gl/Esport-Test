from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.team import Team, JerseyPrompt
from backend.schemas.team import TeamOut, JerseyPromptOut
from backend.services.team_service import list_teams

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("", response_model=list[TeamOut])
def get_teams(db: Session = Depends(get_db)):
    teams = list_teams(db)
    result = []
    for t in teams:
        out = TeamOut(
            id=t.id,
            name=t.name,
            game=t.game,
            region=t.region,
            logo_url=t.logo_url,
            primary_color=t.primary_color,
            secondary_color=t.secondary_color,
            has_jersey_prompt=t.jersey_prompt is not None,
            player_count=len(t.players),
            created_at=t.created_at,
            jersey_prompt=JerseyPromptOut.model_validate(t.jersey_prompt) if t.jersey_prompt else None,
        )
        result.append(out)
    return result


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: str, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamOut(
        id=team.id,
        name=team.name,
        game=team.game,
        region=team.region,
        logo_url=team.logo_url,
        primary_color=team.primary_color,
        secondary_color=team.secondary_color,
        has_jersey_prompt=team.jersey_prompt is not None,
        player_count=len(team.players),
        created_at=team.created_at,
        jersey_prompt=JerseyPromptOut.model_validate(team.jersey_prompt) if team.jersey_prompt else None,
    )


@router.get("/{team_id}/jersey", response_model=JerseyPromptOut)
def get_team_jersey(team_id: str, db: Session = Depends(get_db)):
    jersey = db.query(JerseyPrompt).filter(JerseyPrompt.team_id == team_id).first()
    if not jersey:
        raise HTTPException(status_code=404, detail="No jersey prompt found for this team")
    return JerseyPromptOut.model_validate(jersey)
