from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.dependencies import get_current_user
from app.models.bike import Bike
from app.models.component import Component
from app.models.maintenance_log import MaintenanceLog
from app.models.service_interval import ServiceInterval
from app.models.user import User
from app.schemas.bike import BikeCreate, BikeUpdate, BikeResponse, OdometerUpdate
from app.schemas.due import ComponentDueResponse
from app.services.bike_service import create_bike_with_presets
from app.services.due_service import get_due_components
from app.services.storage_service import get_storage

_MAX_PHOTO_SIZE = 20 * 1024 * 1024  # 20 MB

router = APIRouter(prefix="/api/bikes", tags=["bikes"])


def _get_bike(bike_id: UUID, current_user: User, db: Session) -> Bike:
    bike = db.get(Bike, bike_id)
    if not bike or bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")
    return bike


@router.get("", response_model=list[BikeResponse])
def list_bikes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Bike).filter(Bike.user_id == current_user.id).order_by(Bike.created_at).all()


@router.post("", response_model=BikeResponse, status_code=status.HTTP_201_CREATED)
def create_bike(
    payload: BikeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_bike_with_presets(db, current_user.id, payload)


@router.get("/{bike_id}", response_model=BikeResponse)
def get_bike(
    bike_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_bike(bike_id, current_user, db)


@router.put("/{bike_id}", response_model=BikeResponse)
def update_bike(
    bike_id: UUID,
    payload: BikeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bike = _get_bike(bike_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(bike, field, value)
    db.commit()
    db.refresh(bike)
    return bike


@router.delete("/{bike_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bike(
    bike_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bike = _get_bike(bike_id, current_user, db)
    db.delete(bike)
    db.commit()


@router.get("/{bike_id}/due", response_model=list[ComponentDueResponse])
def get_due_components_for_bike(
    bike_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all components that are overdue, due soon, or have never been serviced."""
    bike = (
        db.query(Bike)
        .options(
            selectinload(Bike.components).selectinload(Component.maintenance_logs),
            selectinload(Bike.components).selectinload(Component.service_interval),
        )
        .filter(Bike.id == bike_id, Bike.user_id == current_user.id)
        .first()
    )
    if not bike:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")

    return get_due_components(bike.components, bike.total_km, date.today())


@router.post("/{bike_id}/photo", response_model=BikeResponse)
async def upload_bike_photo(
    bike_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the cover photo for a bike.

    The format is detected from the file bytes via Pillow — the Content-Type
    header is not required and its value is ignored. Accepted formats: JPEG,
    PNG, WebP, HEIC/HEIF. Maximum size: 20 MB.
    """
    bike = _get_bike(bike_id, current_user, db)

    data = await file.read()
    if len(data) > _MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 20 MB limit.",
        )

    storage = get_storage()
    try:
        file_path, _ = storage.save_photo(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    bike.photo_url = f"/media/{file_path}"
    db.commit()
    db.refresh(bike)
    return bike


@router.patch("/{bike_id}/odometer", response_model=BikeResponse)
def update_odometer(
    bike_id: UUID,
    payload: OdometerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bike = _get_bike(bike_id, current_user, db)
    bike.total_km = payload.total_km
    db.commit()
    db.refresh(bike)
    return bike
