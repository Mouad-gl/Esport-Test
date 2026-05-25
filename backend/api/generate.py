"""
Core generation endpoint — orchestrates the full photoshoot pipeline.

Flow:
  1. Accept photo upload + player metadata
  2. get_or_create_team  → team identity
  3. ensure_jersey_prompt → load saved OR generate+save new
  4. pick_random_pose
  5. build_generation_prompt
  6. Call Nano Banana 2
  7. Quality check
  8. Persist GeneratedImage record
  9. Return result
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.player import Player
from backend.models.generation import GeneratedImage
from backend.schemas.generation import GenerationOut
from backend.services.team_service import get_or_create_team, ensure_jersey_prompt
from backend.services.pose_service import pick_random_pose
from backend.services.prompt_builder import build_generation_prompt
from backend.services.nano_banana import nano_banana_client, NanoBananaError
from backend.services.quality_check import check_generated_image
from backend.services.storage import save_upload, save_generated_from_url

router = APIRouter(prefix="/generate", tags=["generation"])


@router.post("", response_model=GenerationOut)
async def generate_photoshoot(
    player_name: str = Form(...),
    team_name: str = Form(...),
    game: str = Form(...),
    region: str = Form(...),
    role: str | None = Form(None),
    game_tag: str | None = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # --- 1. Save upload ---
    try:
        original_path = await save_upload(photo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # --- 2. Team identity ---
    team, was_created = get_or_create_team(db, team_name, game, region)
    team_status = "new" if was_created else "existing"

    # --- 3. Jersey prompt (load or generate) ---
    jersey_prompt_record = ensure_jersey_prompt(db, team)

    # --- 4. Player record ---
    player = Player(
        team_id=team.id,
        name=player_name.strip(),
        game_tag=game_tag,
        role=role,
        original_photo_url=original_path,
    )
    db.add(player)
    db.flush()

    # --- 5. Random pose ---
    pose = pick_random_pose(db, game)
    pose_prompt = pose.prompt_text if pose else (
        "Confident front-facing esports portrait pose, arms relaxed, direct eye contact with camera."
    )

    # --- 6. Build full generation prompt ---
    full_prompt = build_generation_prompt(
        jersey_prompt=jersey_prompt_record.prompt_text,
        pose_prompt=pose_prompt,
        game=game,
        player_name=player_name,
        team_name=team_name,
    )

    # --- 7. Create pending DB record ---
    record = GeneratedImage(
        player_id=player.id,
        team_id=team.id,
        pose_id=pose.id if pose else None,
        jersey_prompt_id=jersey_prompt_record.id,
        original_photo_url=original_path,
        full_prompt_used=full_prompt,
        status="processing",
    )
    db.add(record)
    db.commit()

    # --- 8. Call Nano Banana 2 ---
    try:
        result = nano_banana_client.generate(image_path=original_path, prompt=full_prompt)
        generated_url = result["image_url"]
    except NanoBananaError as exc:
        record.status = "failed"
        record.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=502, detail=f"Image generation failed: {exc}")

    # --- 9. Quality check ---
    qr = check_generated_image(generated_url)
    record.quality_score = qr.score
    record.quality_passed = qr.passed
    record.quality_issues = json.dumps(qr.issues) if qr.issues else None

    # --- 10. Persist local copy and finalise ---
    local_generated = await save_generated_from_url(generated_url, record.id)
    record.generated_image_url = local_generated or generated_url
    record.status = "completed" if qr.passed else "quality_failed"
    record.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    out = GenerationOut.model_validate(record)
    out.player_name = player.name
    out.team_name = team.name
    out.pose_name = pose.name if pose else None
    return out


@router.get("/{record_id}", response_model=GenerationOut)
def get_generation(record_id: str, db: Session = Depends(get_db)):
    record = db.query(GeneratedImage).filter(GeneratedImage.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Generation record not found")
    out = GenerationOut.model_validate(record)
    if record.player:
        out.player_name = record.player.name
    if record.team:
        out.team_name = record.team.name
    if record.pose:
        out.pose_name = record.pose.name
    return out
