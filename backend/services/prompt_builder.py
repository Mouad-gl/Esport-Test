"""
Prompt construction system.

Two responsibilities:
1. build_jersey_prompt  — generate the team's master jersey identity (called once per team)
2. build_generation_prompt — assemble the full Nano Banana 2 prompt for a specific generation
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Jersey identity vocabulary
# ---------------------------------------------------------------------------

_GAME_PALETTE: dict[str, dict] = {
    "cs2": {
        "styles": ["tactical geometric", "angular military-tech", "minimal dark"],
        "accent_colors": ["#00A3E0", "#FF6B00", "#00FF88", "#E0003D"],
        "bg_themes": "dark tactical, carbon-fibre texture",
    },
    "csgo": {
        "styles": ["tactical geometric", "angular military-tech", "minimal dark"],
        "accent_colors": ["#00A3E0", "#FF6B00", "#00FF88", "#E0003D"],
        "bg_themes": "dark tactical, carbon-fibre texture",
    },
    "valorant": {
        "styles": ["sharp angular valorant-style", "neon-edge minimal", "bold gradient"],
        "accent_colors": ["#FF4655", "#0F1923", "#53212B", "#00B4D8"],
        "bg_themes": "neon city, digital grid overlay",
    },
    "league of legends": {
        "styles": ["regal fantasy armor", "team-branded gradient", "bold heraldic"],
        "accent_colors": ["#C89B3C", "#0BC4E3", "#FF6B00", "#C62828"],
        "bg_themes": "mystical fog, blue particle effects",
    },
    "dota 2": {
        "styles": ["epic high-fantasy", "dark mythic", "bold tribal"],
        "accent_colors": ["#C62828", "#283593", "#F9A825", "#6A1B9A"],
        "bg_themes": "ancient ruin, ember and smoke",
    },
    "apex legends": {
        "styles": ["futuristic sci-fi", "battle-royale aggressive", "sleek military"],
        "accent_colors": ["#FF4F00", "#DB0011", "#1DE9B6", "#AA00FF"],
        "bg_themes": "distant planet, neon wasteland",
    },
    "fortnite": {
        "styles": ["bold pop-art", "vibrant cartoon-tech", "bright gradient"],
        "accent_colors": ["#00C8FF", "#FFD700", "#FF1744", "#76FF03"],
        "bg_themes": "storm sky, colourful action burst",
    },
    "overwatch": {
        "styles": ["sleek futuristic", "hero-brand bold", "clean gradient arc"],
        "accent_colors": ["#F99E1A", "#00AEEF", "#EC1C24", "#8CC63F"],
        "bg_themes": "future city, holographic overlay",
    },
    "rocket league": {
        "styles": ["aerodynamic speed lines", "chrome-metallic", "neon racing"],
        "accent_colors": ["#00D4FF", "#FF6600", "#CCFF00", "#FF0099"],
        "bg_themes": "arena haze, speed blur trails",
    },
}

_REGION_ACCENTS: dict[str, str] = {
    "na": "bold American-sport inspired",
    "eu": "sleek European football-club style",
    "kr": "ultra-clean Korean geometric precision",
    "cn": "red-gold dragon-inspired",
    "sea": "vibrant tropical neon",
    "br": "energetic carnival-tech",
    "la": "fiery Latin neon",
    "jp": "zen minimalist with neon highlight",
    "oce": "ocean-gradient surf-tech",
    "mena": "gold-arabesque metallic",
}

_DESIGN_STYLES = [
    "geometric angular panels",
    "gradient fade side stripe",
    "bold diagonal slash",
    "clean minimal with large logo chest print",
    "dual-tone with contrast collar",
    "full-sublimation digital camo",
    "hexagonal texture overlay",
    "lightning bolt pattern",
    "carbon fibre weave texture",
]

_LOGO_PLACEMENTS = [
    "large centered chest logo, small sleeve badge",
    "left chest logo, right chest sponsor, sleeve stripe",
    "full-front large print, back number",
    "centered chest logo, both sleeve logos",
    "small chest logo, large back print, wrist badge",
]

_SPONSOR_PLACEMENTS = [
    "main sponsor across the chest, secondary sponsor on left sleeve",
    "chest logo dominant, sponsors on collar interior and lower hem",
    "right chest primary sponsor, left chest team logo, sleeve tertiary sponsors",
    "no visible sponsor text — clean team-only design",
    "full-back sponsor, small chest team mark",
]

import hashlib
import random


def _seed_from_name(name: str) -> int:
    """Deterministic seed so same team always gets same design choices."""
    return int(hashlib.md5(name.lower().encode()).hexdigest(), 16) % (2 ** 31)


def build_jersey_prompt(
    team_name: str,
    game: str,
    region: str,
) -> tuple[str, str, dict]:
    """
    Generate the master jersey identity for a new team.

    Returns:
        prompt_text   — the fragment injected into every generation prompt
        description   — human-readable summary
        metadata      — structured design attributes for DB storage
    """
    rng = random.Random(_seed_from_name(team_name))

    game_key = game.strip().lower()
    game_data = _GAME_PALETTE.get(game_key, {
        "styles": ["professional esports gradient", "sleek dark tech", "bold angular"],
        "accent_colors": ["#00A3E0", "#FF6B00", "#FFFFFF"],
        "bg_themes": "dark studio, subtle glow",
    })

    region_key = region.strip().lower()
    region_style = _REGION_ACCENTS.get(region_key, "premium international esports")

    style = rng.choice(game_data["styles"])
    primary_accent = rng.choice(game_data["accent_colors"])
    design = rng.choice(_DESIGN_STYLES)
    logo_place = rng.choice(_LOGO_PLACEMENTS)
    sponsor_place = rng.choice(_SPONSOR_PLACEMENTS)

    # Derive a sensible color pair
    # Primary is the accent, secondary is always dark or white for contrast
    dark_options = ["#0A0A0A", "#111827", "#1A1A2E", "#0D1117"]
    light_options = ["#F5F5F5", "#FFFFFF", "#E8ECEF"]
    secondary = rng.choice(dark_options) if rng.random() > 0.3 else rng.choice(light_options)
    accent = rng.choice(["#FFD700", "#00FFAA", "#FF3366", "#00BFFF"])

    prompt_text = (
        f"Team jersey: '{team_name}' professional esports jersey. "
        f"Style: {style}, {region_style} influence. "
        f"Primary color: {primary_accent}. Secondary color: {secondary}. Accent: {accent}. "
        f"Design pattern: {design}. "
        f"Logo placement: {logo_place}. "
        f"Sponsor placement: {sponsor_place}. "
        f"Game context: {game} team. "
        f"Jersey must be highly detailed, realistic fabric texture, sharp stitching, "
        f"professional esports team apparel quality. "
        f"DO NOT invent unreadable text or random logos — only use '{team_name}' branding."
    )

    description = (
        f"{team_name} ({game}, {region.upper()}) — {style} design with "
        f"{primary_accent} primary color, {design}. "
        f"Logo: {logo_place}."
    )

    metadata = {
        "primary_color": primary_accent,
        "secondary_color": secondary,
        "accent_color": accent,
        "design_style": style,
        "logo_placement": logo_place,
        "sponsor_placement": sponsor_place,
        "jersey_notes": f"Region influence: {region_style}. Game: {game}.",
    }

    return prompt_text, description, metadata


# ---------------------------------------------------------------------------
# Full generation prompt assembler
# ---------------------------------------------------------------------------

_BASE_SCENE_TEMPLATES: dict[str, str] = {
    "FPS": (
        "Professional esports media-day photoshoot for a tactical FPS game. "
        "Cinematic studio lighting, dark tactical background, subtle smoke and rim light, "
        "premium esports photography, sharp details, realistic fabric, clean composition."
    ),
    "MOBA": (
        "Professional esports media-day photoshoot for a competitive MOBA. "
        "Epic fantasy-tech studio lighting, deep blue-purple background with particle effects, "
        "rim lighting, high production esports portrait."
    ),
    "BR": (
        "Professional esports media-day photoshoot for a Battle Royale team. "
        "Dramatic outdoor-studio lighting, explosive neon background with atmospheric haze, "
        "cinematic framing, action-ready composition."
    ),
    "General": (
        "Professional esports media-day photoshoot. "
        "Studio lighting, dark gradient background, subtle light bloom, "
        "premium esports photography, ultra-sharp detail, clean composition."
    ),
}

_GAME_TO_SCENE: dict[str, str] = {
    "cs2": "FPS", "csgo": "FPS", "valorant": "FPS",
    "league of legends": "MOBA", "dota 2": "MOBA",
    "apex legends": "BR", "fortnite": "BR",
    "overwatch": "General", "rocket league": "General",
}


def build_generation_prompt(
    jersey_prompt: str,
    pose_prompt: str,
    game: str,
    player_name: str,
    team_name: str,
) -> str:
    scene_key = _GAME_TO_SCENE.get(game.strip().lower(), "General")
    scene = _BASE_SCENE_TEMPLATES[scene_key]

    return f"""Transform the uploaded normal player photo into a professional esports photoshoot portrait.

Preserve the same face identity, hairstyle, facial structure, age appearance, and natural expression of the person in the uploaded photo. The output person must look identical to the input person.

Use this exact team jersey style:
{jersey_prompt}

Pose:
{pose_prompt}

Scene:
{scene}

Composition:
Upper-body portrait, player centered, confident posture, suitable for player card, roster announcement, MVP graphic, tournament poster, and social media.

Player context:
Name: {player_name} | Team: {team_name} | Game: {game}

Rules — strictly follow every point:
- Do NOT change the player into a different person.
- Do NOT create a different jersey than the one described above.
- Do NOT invent random logos, fake sponsor text, or unreadable writing on the jersey.
- Do NOT distort the face, eyes, hands, or body proportions.
- Do NOT change skin tone, eye color, or hair color.
- Keep jersey colors, logo placement, and sponsor placement exactly as specified.
- Output must be photorealistic, high resolution, sharp details, cinematic quality."""
