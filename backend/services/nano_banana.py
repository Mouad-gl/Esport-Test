"""
Nano Banana 2 API client.

Sends the reference photo (required) and team logo (optional) together with
the assembled prompt. Falls back to mock mode when APP_ENV=development.
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

    def generate(
        self,
        image_path: str | Path,
        prompt: str,
        logo_path: str | Path | None = None,
    ) -> dict:
        """
        Send the reference photo + optional logo + prompt to Nano Banana 2.
        Returns dict with keys: image_url, generation_id, status.
        """
        if self._is_mock_mode():
            return self._mock_response(prompt)

        image_path = Path(image_path)
        if not image_path.exists():
            raise NanoBananaError(f"Reference photo not found: {image_path}")

        def read_file(p: Path) -> tuple[bytes, str]:
            with open(p, "rb") as f:
                data = f.read()
            suffix = p.suffix.lower()
            mime = "image/jpeg" if suffix in (".jpg", ".jpeg") else "image/png"
            return data, mime

        photo_bytes, photo_mime = read_file(image_path)
        files: dict = {
            "image": (image_path.name, io.BytesIO(photo_bytes), photo_mime),
        }

        if logo_path:
            logo_path = Path(logo_path)
            if logo_path.exists():
                logo_bytes, logo_mime = read_file(logo_path)
                files["logo"] = (logo_path.name, io.BytesIO(logo_bytes), logo_mime)

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.base_url}/generate",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files=files,
                    data={"prompt": prompt, "model": self.model},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise NanoBananaError(f"API error {exc.response.status_code}: {exc.response.text}") from exc
        except httpx.RequestError as exc:
            raise NanoBananaError(f"Network error: {exc}") from exc

        if data.get("status") == "failed":
            raise NanoBananaError(f"Generation failed: {data.get('error', 'unknown')}")

        return {
            "image_url": data["image_url"],
            "generation_id": data.get("generation_id", ""),
            "status": data.get("status", "completed"),
        }

    def _mock_response(self, prompt: str) -> dict:
        return {
            "image_url": "https://placehold.co/800x1000/111827/00A3E0?text=Esport+Portrait+Mock",
            "generation_id": "mock-gen-001",
            "status": "completed",
            "_mock": True,
            "_prompt_preview": prompt[:200],
        }


nano_banana_client = NanoBananaClient()
