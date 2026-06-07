from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.component import Component
from app.models.service_interval import IntervalType, ServiceInterval
from app.models.user import User
from app.schemas.interval import (
    ServiceIntervalCreate,
    ServiceIntervalResponse,
    ServiceIntervalUpdate,
)

router = APIRouter(tags=["intervals"])


def _get_component(component_id: UUID, current_user: User, db: Session) -> Component:
    component = db.get(Component, component_id)
    if not component or component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")
    return component


def _get_interval(interval_id: UUID, current_user: User, db: Session) -> ServiceInterval:
    interval = db.get(ServiceInterval, interval_id)
    if not interval or interval.component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interval not found")
    return interval


@router.post(
    "/api/components/{component_id}/interval",
    response_model=ServiceIntervalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interval(
    component_id: UUID,
    payload: ServiceIntervalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    component = _get_component(component_id, current_user, db)
    if component.service_interval:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Interval already exists for this component"
                " — use PUT /api/intervals/{id} to update it"
            ),
        )
    interval = ServiceInterval(component_id=component_id, **payload.model_dump())
    db.add(interval)
    db.commit()
    db.refresh(interval)
    return interval


@router.put("/api/intervals/{interval_id}", response_model=ServiceIntervalResponse)
def update_interval(
    interval_id: UUID,
    payload: ServiceIntervalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interval = _get_interval(interval_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interval, field, value)

    # Re-validate consistency after applying partial update
    if (
        interval.interval_type in (IntervalType.time, IntervalType.both)
        and not interval.interval_days
    ):
        raise HTTPException(
            status_code=422, detail="interval_days is required for this interval_type"
        )
    if (
        interval.interval_type in (IntervalType.distance, IntervalType.both)
        and not interval.interval_km
    ):
        raise HTTPException(
            status_code=422, detail="interval_km is required for this interval_type"
        )

    db.commit()
    db.refresh(interval)
    return interval


@router.delete("/api/intervals/{interval_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interval(
    interval_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interval = _get_interval(interval_id, current_user, db)
    db.delete(interval)
    db.commit()
