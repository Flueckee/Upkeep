from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.maintenance_comment import MaintenanceComment
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.schemas.comment import MaintenanceCommentCreate, MaintenanceCommentResponse

router = APIRouter(tags=["comments"])


def _get_log(log_id: UUID, current_user: User, db: Session) -> MaintenanceLog:
    log = db.get(MaintenanceLog, log_id)
    if not log or log.component.bike.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    return log


@router.get("/api/logs/{log_id}/comments", response_model=list[MaintenanceCommentResponse])
def list_comments(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_log(log_id, current_user, db)
    return (
        db.query(MaintenanceComment)
        .filter(MaintenanceComment.log_id == log_id)
        .order_by(asc(MaintenanceComment.created_at))
        .all()
    )


@router.post(
    "/api/logs/{log_id}/comments",
    response_model=MaintenanceCommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Append a comment to a maintenance log entry",
    description=(
        "Appends a comment to a log entry.\n\n"
        "**Immutability rules:**\n"
        "- Comments are **append-only**. No edit or delete endpoint exists.\n"
        "- `created_at` is set server-side and is never accepted as client input.\n\n"
        "Maximum text length: 1 000 characters."
    ),
)
def create_comment(
    log_id: UUID,
    payload: MaintenanceCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_log(log_id, current_user, db)
    comment = MaintenanceComment(
        log_id=log_id,
        text=payload.text,
        created_at=datetime.now(tz=timezone.utc),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
