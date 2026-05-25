"""
Prompt construction system.

Two responsibilities:
1. build_jersey_prompt  — generate the team's master jersey identity (called once per team)
2. build_generation_prompt — assemble the full Nano Banana 2 prompt for a specific generation
"""
from __future__ import annotations
import hashlib
import random

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
    "centered chest logo, both sleeve logos",
    "full-front large print, back number",
    "small chest logo, large back print, wrist badge",
]

_SPONSOR_PLACEMENTS = [
    "main sponsor across the chest, secondary sponsor on left sleeve",
    "chest logo dominant, sponsors on collar interior and lower hem",
    "right chest primary sponsor, left chest team logo, sleeve tertiary sponsors",
    "no visible sponsor text — clean team-only design",
]

_BASE_COLORS = [
    ("#0A0A0A", "#00A3E0"), ("#111827", "#FF6B00"), ("#1A1A2E", "#00FF88"),
    ("#0D1117", "#E0003D"), ("#1B1B2F", "#FFD700"), ("#12172B", "#AA00FF"),
    ("#0F2027", "#00BFFF"), ("#1C1C1C", "#FF3366"),
]


def _seed(name: str) -> random.Random:
    return random.Random(int(hashlib.md5(name.lower().encode()).hexdigest(), 16) % (2 ** 31))


def build_jersey_prompt(
    team_name: str,
    logo_url: str | None = None,
) -> tuple[str, str, dict]:
    """
    Generate the master jersey identity for a new team.
    logo_url: local path or URL to the uploaded team logo image.

    Returns: (prompt_text, description, metadata)
    """
    rng = _seed(team_name)

    primary, accent = rng.choice(_BASE_COLORS)
    secondary = rng.choice(["#F5F5F5", "#FFFFFF", "#E8ECEF"]) if rng.random() > 0.5 else "#0A0A0A"
    design = rng.choice(_DESIGN_STYLES)
    logo_place = rng.choice(_LOGO_PLACEMENTS)
    sponsor_place = rng.choice(_SPONSOR_PLACEMENTS)

    logo_instruction = (
        "Use the team logo from the provided logo image — place it exactly as specified below. "
        "Reproduce the logo faithfully: keep its shape, colors, and proportions intact."
        if logo_url else
        f"Use '{team_name}' branding as the jersey logo. Do not invent unrelated logos."
    )

    prompt_text = (
        f"Team jersey for '{team_name}'. "
        f"Style: {design}. "
        f"Primary color: {primary}. Secondary color: {secondary}. Accent: {accent}. "
        f"Logo placement: {logo_place}. "
        f"Sponsor placement: {sponsor_place}. "
        f"{logo_instruction} "
        f"Jersey must be highly detailed, realistic fabric texture, sharp stitching, "
        f"professional esports team apparel quality."
    )

    description = (
        f"{team_name} — {design} jersey, primary {primary}, logo: {logo_place}."
    )

    metadata = {
        "primary_color": primary,
        "secondary_color": secondary,
        "accent_color": accent,
        "design_style": design,
        "logo_placement": logo_place,
        "sponsor_placement": sponsor_place,
        "jersey_notes": f"Logo from upload: {bool(logo_url)}",
    }

    return prompt_text, description, metadata


_SCENE = (
    "Professional esports media-day photoshoot. "
    "Cinematic studio lighting, dark gradient background, subtle rim light and smoke, "
    "premium esports photography, ultra-sharp detail, clean composition."
)


def build_generation_prompt(
    jersey_prompt: str,
    pose_prompt: str,
    team_name: str,
    has_logo_image: bool = False,
) -> str:
    logo_note = (
        "A separate team logo image is also provided — incorporate it faithfully into the jersey as described."
        if has_logo_image else ""
    )

    return f"""Transform the uploaded reference photo into a professional esports photoshoot portrait.

Preserve the same face identity, hairstyle, facial structure, age appearance, and natural expression of the person in the uploaded photo. The output person must look identical to the input person.

Use this exact team jersey style:
{jersey_prompt}
{logo_note}

Pose:
{pose_prompt}

Scene:
{_SCENE}

Composition:
Upper-body portrait, player centered, confident posture, suitable for player card, roster announcement, MVP graphic, tournament poster, and social media.

Team: {team_name}

Rules — strictly follow every point:
- Do NOT change the player into a different person.
- Do NOT create a different jersey than the one described above.
- Do NOT invent random logos or unreadable text on the jersey.
- Do NOT distort the face, eyes, hands, or body proportions.
- Do NOT change skin tone, eye color, or hair color.
- Keep jersey colors, logo placement, and design exactly as specified.
- Output must be photorealistic, high resolution, sharp details, cinematic quality."""
