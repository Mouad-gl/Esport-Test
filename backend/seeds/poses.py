"""
Seed the pose library. Safe to run multiple times — skips existing poses by name.
"""
from sqlalchemy.orm import Session
from backend.models.pose import Pose

POSE_DATA = [
    # ── FPS ──────────────────────────────────────────────────────────────────
    {
        "name": "Tactical FPS Player",
        "game_type": "FPS",
        "prompt_text": (
            "Subject in a confident tactical FPS player stance. Body slightly angled "
            "to the side, arms close to the body as if holding a rifle just out of frame. "
            "Head turned directly toward camera with a focused, intense expression. "
            "Weight distributed forward, battle-ready posture."
        ),
    },
    {
        "name": "Adjusting Headset",
        "game_type": "FPS",
        "prompt_text": (
            "Subject raising one hand to adjust a professional gaming headset. "
            "Elbow elevated, slight downward gaze with a composed, professional expression. "
            "Other arm relaxed at side. Clean upper-body portrait framing."
        ),
    },
    {
        "name": "Arms Crossed Captain",
        "game_type": "FPS",
        "prompt_text": (
            "Subject standing with arms firmly crossed across the chest. "
            "Posture upright and commanding. Direct eye contact with camera. "
            "Chin slightly raised. Conveys team captain authority and confidence."
        ),
    },
    {
        "name": "Slight Side-Angle",
        "game_type": "FPS",
        "prompt_text": (
            "Subject at a 30-degree angle to the camera, body turned slightly left. "
            "Head rotated to face the camera directly. One shoulder closer to the lens. "
            "Relaxed yet confident posture. Magazine-cover framing."
        ),
    },
    {
        "name": "Serious Roster Photo",
        "game_type": "FPS",
        "prompt_text": (
            "Subject in a standard professional roster photo pose. "
            "Perfectly centered, facing the camera directly. "
            "Arms at sides, hands relaxed. Neutral but determined expression. "
            "Clean upright posture as seen in official team announcements."
        ),
    },
    {
        "name": "Hero Spotlight",
        "game_type": "FPS",
        "prompt_text": (
            "Subject standing in a hero spotlight pose. Arms slightly extended and relaxed at sides. "
            "Body fully facing camera. Chin up, proud expression. "
            "Dramatic rim lighting from behind accentuates the silhouette. "
            "Feels like an MVP award moment."
        ),
    },
    {
        "name": "Confident Front-Facing",
        "game_type": "FPS",
        "prompt_text": (
            "Subject facing directly forward, one hand loosely in a pocket or resting on the waist. "
            "Other arm relaxed at side. Slight confident smile. "
            "Approachable yet professional — ideal for player card and social media."
        ),
    },
    # ── MOBA ─────────────────────────────────────────────────────────────────
    {
        "name": "MOBA Commander",
        "game_type": "MOBA",
        "prompt_text": (
            "Subject in a commanding MOBA player pose. Leaning very slightly forward, "
            "elbows bent as if hovering over a keyboard. Intense focused expression. "
            "Energy of a mid-game teamfight call. Powerful and strategic framing."
        ),
    },
    {
        "name": "Victory Fist Pump",
        "game_type": "MOBA",
        "prompt_text": (
            "Subject with one fist raised at chest height in a restrained victory pose. "
            "Small but genuine smile. Eyes forward. Celebrates a win without being over-the-top. "
            "Professional and controlled energy."
        ),
    },
    {
        "name": "Arms Crossed MOBA",
        "game_type": "MOBA",
        "prompt_text": (
            "Subject standing with arms crossed, body at a slight three-quarter angle. "
            "Looking at the camera with calm, calculated confidence. "
            "The pose of a mid-laner who has seen everything."
        ),
    },
    # ── Battle Royale ─────────────────────────────────────────────────────────
    {
        "name": "Battle Royale Ready",
        "game_type": "BR",
        "prompt_text": (
            "Subject in a battle-ready stance: weight forward, legs slightly apart, "
            "fists loosely at sides. Expression intense, eyes locked on camera. "
            "Feels like dropping into the final circle with full confidence."
        ),
    },
    {
        "name": "BR Point and Look Away",
        "game_type": "BR",
        "prompt_text": (
            "Subject pointing to the side dramatically with one arm fully extended, "
            "head turned away from camera in the pointing direction. "
            "Dynamic action energy, like calling a squad push. "
            "Other hand on hip. Strong editorial framing."
        ),
    },
    # ── General ──────────────────────────────────────────────────────────────
    {
        "name": "Over-the-Shoulder",
        "game_type": "General",
        "prompt_text": (
            "Subject with back mostly toward the camera, head turned sharply over one shoulder "
            "to look directly into the lens. One shoulder elevated. "
            "Mysterious, high-fashion editorial energy adapted to esports."
        ),
    },
    {
        "name": "Lean and Cross",
        "game_type": "General",
        "prompt_text": (
            "Subject leaning very slightly to one side, arms loosely crossed at waist height. "
            "Relaxed, approachable pose. Slight smirk. "
            "Works for all game types — versatile and clean."
        ),
    },
]


def seed_poses(db: Session) -> int:
    existing_names = {p.name for p in db.query(Pose.name).all()}
    added = 0
    for data in POSE_DATA:
        if data["name"] not in existing_names:
            db.add(Pose(**data))
            added += 1
    db.commit()
    return added
