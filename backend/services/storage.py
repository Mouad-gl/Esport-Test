"""
File storage abstraction — local filesystem implementation.
Swap out save_upload() and save_generated() to use S3/GCS without touching callers.
"""
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from backend.config import settings

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


async def save_upload(file: UploadFile) -> str:
    """
    Validate and persist an uploaded photo.
    Returns the relative path string (stored in DB).
    """
    if file.content_type not in _ALLOWED_MIME:
        raise ValueError(f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise ValueError(f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.")

    ext = _ext_from_mime(file.content_type)
    filename = f"{uuid.uuid4()}{ext}"
    dest = settings.upload_originals_dir / filename
    dest.parent.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)

    return str(dest)


async def save_generated_from_url(image_url: str, record_id: str) -> str | None:
    """
    Download a generated image from a URL and persist it locally.
    Returns local path or None if download failed.
    """
    import httpx

    dest_dir = settings.upload_generated_dir
    dest_dir.mkdir(parents=True, exist_ok=True)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg")
            ext = _ext_from_mime(content_type)
            filename = f"{record_id}{ext}"
            dest = dest_dir / filename
            async with aiofiles.open(dest, "wb") as f:
                await f.write(resp.content)
            return str(dest)
    except Exception:
        return None


def _ext_from_mime(mime: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(mime.split(";")[0].strip(), ".jpg")
