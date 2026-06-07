from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.maintenance_log import MaintenanceLog
from app.models.maintenance_photo import MaintenancePhoto
from app.models.user import User
from app.schemas.photo import MaintenancePhotoResponse
from app.services.storage_service import get_storage

router = APIRouter(tags=["photos"])

_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _get_log(log_id: UUID, current_user: User, db: Session) -> MaintenanceLog:
    log = db.get(MaintenanceLog, log_id)
    if not log or log.component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return log


def _photo_to_response(photo: MaintenancePhoto) -> MaintenancePhotoResponse:
    storage = get_storage()
    return MaintenancePhotoResponse(
        id=photo.id,
        log_id=photo.log_id,
        file_url=storage.url_for(photo.file_path),
        thumbnail_url=storage.url_for(photo.thumbnail_path),
        uploaded_at=photo.uploaded_at,
        caption=photo.caption,
    )


@router.get("/api/logs/{log_id}/photos", response_model=list[MaintenancePhotoResponse])
def list_photos(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _get_log(log_id, current_user, db)
    return [_photo_to_response(p) for p in log.photos]


@router.post(
    "/api/logs/{log_id}/photos",
    response_model=MaintenancePhotoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a photo for a maintenance log entry",
    description=(
        "Uploads a single image file and attaches it to the log entry.\n\n"
        "**Immutability rules:**\n"
        "- Photos cannot be deleted or replaced after upload.\n"
        "- `uploaded_at` is set server-side and is not accepted as client input.\n\n"
        "Accepted types: JPEG, PNG, WebP, HEIC/HEIF. Maximum size: 20 MB.\n"
        "The format is detected from the file bytes — the Content-Type header is not required."
    ),
)
async def upload_photo(
    log_id: UUID,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = _get_log(log_id, current_user, db)

    data = await file.read()
    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 20 MB limit.",
        )

    if caption and len(caption) > 200:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Caption must be 200 characters or fewer.",
        )

    storage = get_storage()
    try:
        file_path, thumb_path = storage.save_photo(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    photo = MaintenancePhoto(
        log_id=log.id,
        file_path=file_path,
        thumbnail_path=thumb_path,
        caption=caption,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _photo_to_response(photo)
