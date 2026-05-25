"""
Nano Banana 2 API client.

Expected API contract (configurable via env):
  POST {NANO_BANANA_API_URL}/generate
  Multipart form:
    - image: binary file
    - prompt: string
    - model: string
  Response JSON:
    { "image_url": "https://...", "generation_id": "...", "status": "completed" }
    or
    { "error": "...", "status": "failed" }

The client falls back to a mock response when APP_ENV=development and no real
API key is configured, so the rest of the platform can be developed and tested
without a live Nano Banana 2 subscription.
"""
from __future__ import annotations

import io
import httpx
from pathlib import Path
from backend.config import settings


class NanoBananaError(Exception):
    pass


class NanoBananaClient:
    def __init__(self):
        self.base_url = settings.NANO_BANANA_API_URL.rstrip("/")
        self.api_key = settings.NANO_BANANA_API_KEY
        self.model = settings.NANO_BANANA_MODEL
        self.timeout = settings.NANO_BANANA_TIMEOUT

    def _is_mock_mode(self) -> bool:
        return settings.APP_ENV == "development" and self.api_key in ("demo_key", "your_api_key_here", "")

    def generate(self, image_path: str | Path, prompt: str) -> dict:
        """
        Send the player photo + assembled prompt to Nano Banana 2.
        Returns dict with keys: image_url, generation_id, status.
        """
        if self._is_mock_mode():
            return self._mock_response(prompt)

        image_path = Path(image_path)
        if not image_path.exists():
            raise NanoBananaError(f"Image file not found: {image_path}")

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        suffix = image_path.suffix.lower()
        mime = "image/jpeg" if suffix in (".jpg", ".jpeg") else "image/png"

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/generate",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"image": (image_path.name, io.BytesIO(image_bytes), mime)},
                    data={"prompt": prompt, "model": self.model},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise NanoBananaError(f"Nano Banana API error {exc.response.status_code}: {exc.response.text}") from exc
        except httpx.RequestError as exc:
            raise NanoBananaError(f"Network error calling Nano Banana API: {exc}") from exc

        if data.get("status") == "failed":
            raise NanoBananaError(f"Generation failed: {data.get('error', 'unknown')}")

        return {
            "image_url": data["image_url"],
            "generation_id": data.get("generation_id", ""),
            "status": data.get("status", "completed"),
        }

    def _mock_response(self, prompt: str) -> dict:
        """Development stub — returns a placeholder image URL."""
        return {
            "image_url": "https://placehold.co/800x1000/111827/00A3E0?text=Esport+Portrait+Mock",
            "generation_id": "mock-gen-001",
            "status": "completed",
            "_mock": True,
            "_prompt_preview": prompt[:200],
        }


nano_banana_client = NanoBananaClient()
