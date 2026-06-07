from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.component import Component
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.schemas.log import MaintenanceLogCreate, MaintenanceLogResponse

router = APIRouter(tags=["logs"])


def _get_component(component_id: UUID, current_user: User, db: Session) -> Component:
    component = db.get(Component, component_id)
    if not component or component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")
    return component


@router.get("/api/components/{component_id}/logs", response_model=list[MaintenanceLogResponse])
def list_logs(
    component_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_component(component_id, current_user, db)
    return (
        db.query(MaintenanceLog)
        .filter(MaintenanceLog.component_id == component_id)
        .order_by(desc(MaintenanceLog.performed_at))
        .all()
    )


@router.get("/api/logs/{log_id}", response_model=MaintenanceLogResponse)
def get_log(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.get(MaintenanceLog, log_id)
    if not log or log.component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return log


@router.post(
    "/api/components/{component_id}/logs",
    response_model=MaintenanceLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a maintenance log entry",
    description=(
        "Creates a new maintenance log entry for a component.\n\n"
        "**Immutability rules:**\n"
        "- Once created, this entry **cannot be updated or deleted**. No PUT, PATCH, or DELETE "
        "endpoint exists for log entries.\n"
        "- `recorded_at` is set server-side at the moment of insert and is never accepted as "
        "client input.\n"
        "- `performed_at` must be between today − 7 days and today (UTC). Future dates and entries "
        "older than 7 days are rejected with HTTP 422."
    ),
)
def create_log(
    component_id: UUID,
    payload: MaintenanceLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_component(component_id, current_user, db)
    now = datetime.now(tz=timezone.utc)
    log = MaintenanceLog(
        component_id=component_id,
        recorded_at=now,
        created_at=now,
        **payload.model_dump(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
