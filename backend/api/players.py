from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.player import Player
from backend.models.generation import GeneratedImage
from backend.schemas.player import PlayerOut
from backend.schemas.generation import GenerationOut

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=list[PlayerOut])
def list_players(db: Session = Depends(get_db)):
    return db.query(Player).order_by(Player.created_at.desc()).all()


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: str, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.get("/{player_id}/gallery", response_model=list[GenerationOut])
def player_gallery(player_id: str, db: Session = Depends(get_db)):
    records = (
        db.query(GeneratedImage)
        .filter(GeneratedImage.player_id == player_id)
        .order_by(GeneratedImage.created_at.desc())
        .all()
    )
    result = []
    for r in records:
        out = GenerationOut.model_validate(r)
        if r.player:
            out.player_name = r.player.name
        if r.team:
            out.team_name = r.team.name
        if r.pose:
            out.pose_name = r.pose.name
        result.append(out)
    return result
