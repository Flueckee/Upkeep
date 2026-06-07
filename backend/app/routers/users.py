"""
User-profile endpoints.

  PATCH /api/users/me               — update name and/or primary_color
  POST  /api/users/me/avatar        — upload / replace profile photo (JPEG/PNG, ≤ 5 MB)
  POST  /api/users/me/change-password — change password
"""
from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, UserResponse, UserUpdateRequest
from app.services.auth_service import hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["users"])

_UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
_AVATAR_DIR = _UPLOAD_DIR / "avatars"
_MAX_AVATAR_BYTES = 5 * 1024 * 1024   # 5 MB
_AVATAR_PX = 96                         # square output size


# ── PATCH /api/users/me ──────────────────────────────────────────────────────

@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's display name and/or primary colour."""
    if payload.name is not None:
        current_user.name = payload.name
    if payload.primary_color is not None:
        current_user.primary_color = payload.primary_color
    db.commit()
    db.refresh(current_user)
    return current_user


# ── POST /api/users/me/avatar ─────────────────────────────────────────────────

@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the profile avatar.

    Accepted formats: JPEG, PNG.  Maximum size: 5 MB.
    The image is centre-cropped to a square and saved as a 96 × 96 JPEG.
    """
    data = await file.read()
    if len(data) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 5 MB limit.",
        )

    # Detect format from bytes — ignore Content-Type header
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))   # re-open after verify()
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File is not a recognised image format.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid or corrupted image: {exc}",
        )

    if img.format not in ("JPEG", "PNG"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported format '{img.format}'. Only JPEG and PNG are accepted for avatars.",  # noqa: E501
        )

    # Centre-crop to square then resize
    w, h = img.size
    min_dim = min(w, h)
    left  = (w - min_dim) // 2
    top   = (h - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))
    img = img.resize((_AVATAR_PX, _AVATAR_PX), Image.LANCZOS)

    # Ensure RGB (PNG may have alpha channel)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Persist
    _AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    name = uuid.uuid4().hex
    out_path = _AVATAR_DIR / f"{name}.jpg"
    img.save(out_path, format="JPEG", quality=92)

    # Remove old avatar file if it lives under our managed directory
    _delete_old_avatar(current_user.avatar_url)

    current_user.avatar_url = f"/media/avatars/{name}.jpg"
    db.commit()
    db.refresh(current_user)
    return current_user


def _delete_old_avatar(avatar_url: str | None) -> None:
    """Best-effort deletion of a previously stored avatar file.

    Only removes files under /media/avatars/ to prevent path-traversal
    deleting unrelated uploads.
    """
    if not avatar_url:
        return
    # Reject anything that doesn't look like one of our managed avatar URLs.
    _AVATAR_PREFIX = "/media/avatars/"
    if not avatar_url.startswith(_AVATAR_PREFIX):
        return
    rel = avatar_url.removeprefix("/media/")   # → "avatars/abc123.jpg"
    target = _UPLOAD_DIR / rel
    try:
        if target.exists():
            target.unlink()
    except Exception:
        pass   # non-fatal


# ── POST /api/users/me/change-password ───────────────────────────────────────

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the authenticated user's password.

    Requires the current password for verification.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
