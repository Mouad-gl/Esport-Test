"""
Quality gate for generated images.

Checks performed:
1. Image is downloadable / accessible
2. Meets minimum resolution
3. Is not a blank / solid-color image (pixel variance check)
4. Aspect ratio is portrait-appropriate for player cards

Score 0–100. Images below QUALITY_MIN_SCORE are flagged but still returned
(the caller decides whether to reject or warn).
"""
from __future__ import annotations

import io
import httpx
from pathlib import Path
from backend.config import settings

try:
    from PIL import Image, ImageStat
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class QualityResult:
    def __init__(self):
        self.score: float = 0.0
        self.passed: bool = False
        self.issues: list[str] = []

    def to_dict(self) -> dict:
        return {"score": self.score, "passed": self.passed, "issues": self.issues}


def check_generated_image(image_url: str) -> QualityResult:
    result = QualityResult()

    if not PIL_AVAILABLE:
        # PIL not installed — skip visual checks, assume pass
        result.score = 75.0
        result.passed = True
        result.issues.append("PIL not available — visual quality check skipped")
        return result

    # --- Download ---
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as exc:
        result.score = 0.0
        result.passed = False
        result.issues.append(f"Could not fetch generated image: {exc}")
        return result

    # --- Open with Pillow ---
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        result.score = 0.0
        result.passed = False
        result.issues.append(f"Cannot open image: {exc}")
        return result

    score = 100.0
    min_res = settings.QUALITY_MIN_RESOLUTION

    # Check 1: resolution
    w, h = img.size
    if w < min_res or h < min_res:
        score -= 30
        result.issues.append(f"Low resolution: {w}x{h} (minimum {min_res}px)")

    # Check 2: portrait aspect ratio (height > width preferred for player cards)
    aspect = h / w if w > 0 else 0
    if aspect < 0.8:
        score -= 15
        result.issues.append(f"Image is too wide for a portrait card (aspect ratio {aspect:.2f})")

    # Check 3: not blank / solid color — check pixel variance
    stat = ImageStat.Stat(img)
    avg_stddev = sum(stat.stddev) / len(stat.stddev)
    if avg_stddev < 5.0:
        score -= 40
        result.issues.append("Image appears blank or solid color (very low pixel variance)")
    elif avg_stddev < 15.0:
        score -= 15
        result.issues.append("Image has very low visual complexity — may be degraded")

    # Check 4: extreme darkness (average brightness below 20/255)
    avg_mean = sum(stat.mean) / len(stat.mean)
    if avg_mean < 20:
        score -= 20
        result.issues.append("Image is extremely dark — possible generation failure")

    result.score = max(0.0, score)
    result.passed = result.score >= settings.QUALITY_MIN_SCORE
    return result


def check_local_image(image_path: str | Path) -> QualityResult:
    """Quality check for a locally saved image file."""
    result = QualityResult()

    if not PIL_AVAILABLE:
        result.score = 75.0
        result.passed = True
        return result

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as exc:
        result.score = 0.0
        result.passed = False
        result.issues.append(f"Cannot open image: {exc}")
        return result

    score = 100.0
    min_res = settings.QUALITY_MIN_RESOLUTION
    w, h = img.size

    if w < min_res or h < min_res:
        score -= 30
        result.issues.append(f"Low resolution: {w}x{h}")

    aspect = h / w if w > 0 else 0
    if aspect < 0.8:
        score -= 15
        result.issues.append(f"Not portrait aspect: {aspect:.2f}")

    stat = ImageStat.Stat(img)
    avg_stddev = sum(stat.stddev) / len(stat.stddev)
    if avg_stddev < 5.0:
        score -= 40
        result.issues.append("Blank/solid color image")

    result.score = max(0.0, score)
    result.passed = result.score >= settings.QUALITY_MIN_SCORE
    return result
