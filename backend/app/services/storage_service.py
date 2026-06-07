"""
Storage service — abstract interface over file storage.

MVP uses local filesystem.  Swap `LocalStorageService` for an S3 implementation
later without touching any other code.
"""
from __future__ import annotations

import io
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from PIL import Image, UnidentifiedImageError

# ── Public interface ──────────────────────────────────────────────────────────

class StorageService(ABC):
    @abstractmethod
    def save_photo(self, data: bytes) -> tuple[str, str]:
        """
        Persist *data* and return ``(file_path, thumbnail_path)``.

        The format is detected from the image bytes via Pillow — the
        ``Content-Type`` header is intentionally ignored so that quirks
        like ``image/jpg``, params (``image/jpeg; name=…``), or a missing
        type from Expo web never cause a false rejection.

        Raises ``ValueError`` for non-image data or unsupported formats.
        """

    @abstractmethod
    def url_for(self, path: str) -> str:
        """Return the public URL for *path*."""

    @abstractmethod
    def delete(self, path: str) -> None:
        """Remove a stored file (used only internally; the API never exposes this)."""


# ── Local filesystem implementation ──────────────────────────────────────────

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
THUMB_SIZE = (400, 400)

# Pillow format name → file extension
_PILLOW_FORMAT_TO_EXT: dict[str, str] = {
    "JPEG": ".jpg",
    "PNG":  ".png",
    "WEBP": ".webp",
    "HEIF": ".heic",   # Pillow reports HEIC/HEIF as "HEIF"
}

# Loose set used only for an optional early-reject on clearly wrong MIME types.
# We still let Pillow be the authoritative validator.
_IMAGE_MIME_PREFIXES = ("image/",)


class LocalStorageService(StorageService):
    """Stores files under ``UPLOAD_DIR/{originals,thumbnails}``."""

    def __init__(self, base_dir: Path = UPLOAD_DIR, base_url: str = "/media") -> None:
        self._base = base_dir
        self._base_url = base_url.rstrip("/")
        (self._base / "originals").mkdir(parents=True, exist_ok=True)
        (self._base / "thumbnails").mkdir(parents=True, exist_ok=True)

    def save_photo(self, data: bytes) -> tuple[str, str]:
        # Detect format from bytes — never trust the Content-Type header
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()           # raises on corrupt data
            img = Image.open(io.BytesIO(data))   # re-open; verify() exhausts the stream
        except UnidentifiedImageError:
            raise ValueError("Datei ist kein erkanntes Bildformat.")
        except Exception as exc:
            raise ValueError(f"Ungültige oder beschädigte Bilddatei: {exc}")

        pillow_fmt = img.format  # e.g. "JPEG", "PNG", "WEBP"
        ext = _PILLOW_FORMAT_TO_EXT.get(pillow_fmt or "")
        if not ext:
            raise ValueError(
                f"Nicht unterstütztes Bildformat '{pillow_fmt}'. "
                "Erlaubt: JPEG, PNG, WebP, HEIC."
            )

        name = uuid.uuid4().hex

        # Original
        orig_rel = f"originals/{name}{ext}"
        (self._base / orig_rel).write_bytes(data)

        # Thumbnail
        thumb_rel = f"thumbnails/{name}{ext}"
        img.thumbnail(THUMB_SIZE, Image.LANCZOS)
        img.save(self._base / thumb_rel)

        return orig_rel, thumb_rel

    def url_for(self, path: str) -> str:
        return f"{self._base_url}/{path}"

    def delete(self, path: str) -> None:
        target = self._base / path
        if target.exists():
            target.unlink()


# ── Singleton ─────────────────────────────────────────────────────────────────

_storage: StorageService | None = None


def get_storage() -> StorageService:
    global _storage
    if _storage is None:
        _storage = LocalStorageService()
    return _storage
