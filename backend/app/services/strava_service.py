"""Business logic for the Strava integration: OAuth state, connection
management, gear→bike resolution, and idempotent km application.

HTTP calls are delegated to ``strava_client`` (mockable in tests).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from jose import jwt, JWTError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.bike import Bike
from app.models.strava_activity import StravaImportedActivity
from app.models.strava_connection import StravaConnection
from app.models.strava_gear_mapping import StravaGearMapping
from app.services import strava_client

_STATE_ALGORITHM = "HS256"
_STATE_PURPOSE = "strava_oauth"
_REFRESH_BUFFER = timedelta(minutes=5)

# Strava activity types that count as cycling.
RIDE_TYPES = {
    "Ride",
    "VirtualRide",
    "EBikeRide",
    "GravelRide",
    "MountainBikeRide",
    "Handcycle",
    "Velomobile",
}


# ── OAuth state (ties the browser callback back to an authenticated user) ──────

def create_oauth_state(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "purpose": _STATE_PURPOSE},
        settings.secret_key,
        algorithm=_STATE_ALGORITHM,
    )


def verify_oauth_state(state: str) -> uuid.UUID:
    """Return the user id encoded in a state token, or raise JWTError."""
    payload = jwt.decode(state, settings.secret_key, algorithms=[_STATE_ALGORITHM])
    if payload.get("purpose") != _STATE_PURPOSE:
        raise JWTError("invalid state purpose")
    return uuid.UUID(payload["sub"])


def build_authorize_url(state: str) -> str:
    redirect_uri = f"{settings.public_base_url}/api/integrations/strava/callback"
    params = {
        "client_id": settings.strava_client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "approval_prompt": "auto",
        "scope": "read,activity:read_all",
        "state": state,
    }
    return f"{strava_client.AUTHORIZE_URL}?{urlencode(params)}"


# ── Connection lookup / persistence ──────────────────────────────────────────

def get_connection_by_user(db: Session, user_id: uuid.UUID) -> StravaConnection | None:
    return db.query(StravaConnection).filter(StravaConnection.user_id == user_id).first()


def get_connection_by_athlete(db: Session, athlete_id: int) -> StravaConnection | None:
    return db.query(StravaConnection).filter(StravaConnection.athlete_id == athlete_id).first()


def upsert_connection(db: Session, user_id: uuid.UUID, token_payload: dict, scope: str | None) -> StravaConnection:
    athlete = token_payload.get("athlete") or {}
    conn = get_connection_by_user(db, user_id)
    if conn is None:
        conn = StravaConnection(user_id=user_id)
        db.add(conn)
    if athlete.get("id"):
        conn.athlete_id = athlete["id"]
    conn.access_token = token_payload["access_token"]
    conn.refresh_token = token_payload["refresh_token"]
    conn.expires_at = datetime.utcfromtimestamp(token_payload["expires_at"])
    if scope is not None:
        conn.scope = scope
    conn.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(conn)
    return conn


def disconnect(db: Session, conn: StravaConnection) -> None:
    """Revoke on Strava (best-effort) and delete the local connection + mappings.

    Already-applied kilometers stay on the bikes (treated as historical odometer).
    """
    try:
        token = get_valid_access_token(db, conn)
        strava_client.deauthorize(token)
    except Exception:
        pass  # revocation is best-effort; always remove the local record
    db.delete(conn)
    db.commit()


def get_valid_access_token(db: Session, conn: StravaConnection) -> str:
    """Return a non-expired access token, refreshing + persisting if needed."""
    if conn.expires_at - _REFRESH_BUFFER <= datetime.utcnow():
        payload = strava_client.refresh_access_token(conn.refresh_token)
        conn.access_token = payload["access_token"]
        conn.refresh_token = payload["refresh_token"]
        conn.expires_at = datetime.utcfromtimestamp(payload["expires_at"])
        conn.updated_at = datetime.utcnow()
        db.commit()
    return conn.access_token


# ── Gear → bike resolution ───────────────────────────────────────────────────

def resolve_target_bike(db: Session, conn: StravaConnection, gear_id: str | None) -> Bike | None:
    """Resolve the bike an activity's distance should be applied to.

    - gear with a mapping → that bike
    - gear mapped to NULL → explicitly ignored (None)
    - no gear / no mapping → the connection's default bike
    """
    if gear_id:
        mapping = (
            db.query(StravaGearMapping)
            .filter(StravaGearMapping.connection_id == conn.id, StravaGearMapping.gear_id == gear_id)
            .first()
        )
        if mapping is not None:
            if mapping.bike_id is None:
                return None  # explicitly ignored
            return _owned_bike(db, conn, mapping.bike_id)
    if conn.default_bike_id:
        return _owned_bike(db, conn, conn.default_bike_id)
    return None


def _owned_bike(db: Session, conn: StravaConnection, bike_id: uuid.UUID) -> Bike | None:
    bike = db.get(Bike, bike_id)
    if bike and bike.user_id == conn.user_id:
        return bike
    return None


def _is_ride(activity: dict) -> bool:
    return activity.get("sport_type") in RIDE_TYPES or activity.get("type") in RIDE_TYPES


def _activity_km(activity: dict) -> float:
    # Strava distance is always in meters.
    return (activity.get("distance") or 0.0) / 1000.0


# ── Idempotent km application ────────────────────────────────────────────────

def apply_activity_create(db: Session, conn: StravaConnection, activity: dict) -> None:
    """Apply a newly created activity's distance to its bike, exactly once."""
    if not _is_ride(activity):
        return
    activity_id = activity["id"]
    existing = _find_import(db, conn, activity_id)
    if existing is not None:
        return  # already imported
    bike = resolve_target_bike(db, conn, activity.get("gear_id"))
    if bike is None:
        return
    km = _activity_km(activity)
    record = StravaImportedActivity(
        connection_id=conn.id,
        activity_id=activity_id,
        bike_id=bike.id,
        applied_km=km,
        gear_id=activity.get("gear_id"),
    )
    db.add(record)
    bike.total_km = (bike.total_km or 0.0) + km
    try:
        db.commit()
    except IntegrityError:
        # A concurrent webhook delivery already imported this activity.
        db.rollback()


def apply_activity_update(db: Session, conn: StravaConnection, activity: dict) -> None:
    """Re-apply an edited activity: reverse the old amount, apply the new one."""
    existing = _find_import(db, conn, activity["id"])
    if existing is None:
        apply_activity_create(db, conn, activity)
        return

    # Reverse the previously applied amount from the old bike.
    if existing.bike_id:
        old_bike = db.get(Bike, existing.bike_id)
        if old_bike:
            old_bike.total_km = max(0.0, (old_bike.total_km or 0.0) - existing.applied_km)

    new_bike = resolve_target_bike(db, conn, activity.get("gear_id")) if _is_ride(activity) else None
    if new_bike is None:
        # No longer maps to a bike (or no longer a ride) → drop the ledger row.
        db.delete(existing)
        db.commit()
        return

    new_km = _activity_km(activity)
    new_bike.total_km = (new_bike.total_km or 0.0) + new_km
    existing.bike_id = new_bike.id
    existing.applied_km = new_km
    existing.gear_id = activity.get("gear_id")
    existing.updated_at = datetime.utcnow()
    db.commit()


def apply_activity_delete(db: Session, conn: StravaConnection, activity_id: int) -> None:
    """Reverse a deleted activity's contribution."""
    existing = _find_import(db, conn, activity_id)
    if existing is None:
        return
    if existing.bike_id:
        bike = db.get(Bike, existing.bike_id)
        if bike:
            bike.total_km = max(0.0, (bike.total_km or 0.0) - existing.applied_km)
    db.delete(existing)
    db.commit()


def _find_import(db: Session, conn: StravaConnection, activity_id: int) -> StravaImportedActivity | None:
    return (
        db.query(StravaImportedActivity)
        .filter(
            StravaImportedActivity.connection_id == conn.id,
            StravaImportedActivity.activity_id == activity_id,
        )
        .first()
    )


# ── Webhook event dispatch ───────────────────────────────────────────────────

def process_activity_event(db: Session, conn: StravaConnection, activity_id: int, aspect_type: str) -> None:
    """Handle an activity webhook event by fetching the activity and applying it."""
    if aspect_type == "delete":
        apply_activity_delete(db, conn, activity_id)
        return
    token = get_valid_access_token(db, conn)
    activity = strava_client.get_activity(token, activity_id)
    if aspect_type == "update":
        apply_activity_update(db, conn, activity)
    else:  # "create"
        apply_activity_create(db, conn, activity)


# ── Backfill ─────────────────────────────────────────────────────────────────

def backfill_recent(db: Session, conn: StravaConnection) -> None:
    """One-time import of recent activities right after connecting."""
    token = get_valid_access_token(db, conn)
    after = int((datetime.utcnow() - timedelta(days=settings.strava_backfill_days)).timestamp())
    page = 1
    while True:
        activities = strava_client.list_activities(token, after=after, per_page=100, page=page)
        if not activities:
            break
        for activity in activities:
            apply_activity_create(db, conn, activity)
        if len(activities) < 100:
            break
        page += 1
    conn.last_backfill_at = datetime.utcnow()
    db.commit()


# ── Gear listing for the settings UI ─────────────────────────────────────────

def list_gear(db: Session, conn: StravaConnection) -> list[dict]:
    """Return the athlete's Strava bikes merged with the current mapping choice."""
    token = get_valid_access_token(db, conn)
    athlete = strava_client.get_athlete(token)
    mappings = {m.gear_id: m for m in conn.mappings}
    result = []
    for gear in athlete.get("bikes") or []:
        mapping = mappings.get(gear["id"])
        result.append(
            {
                "gear_id": gear["id"],
                "name": gear.get("name") or gear["id"],
                "distance_km": (gear.get("distance") or 0.0) / 1000.0,
                "bike_id": mapping.bike_id if mapping else None,
                "ignored": mapping is not None and mapping.bike_id is None,
            }
        )
    return result


def replace_mappings(
    db: Session,
    conn: StravaConnection,
    items: list[dict],
    default_bike_id: uuid.UUID | None,
) -> None:
    """Replace all gear mappings and set the default bike.

    Each item: ``{"gear_id": str, "bike_id": UUID|None, "ignore": bool}``.
    Items that neither set a bike nor ignore are dropped (→ fall back to default).
    """
    db.query(StravaGearMapping).filter(StravaGearMapping.connection_id == conn.id).delete()
    for item in items:
        if item.get("ignore"):
            db.add(StravaGearMapping(connection_id=conn.id, gear_id=item["gear_id"], bike_id=None))
        elif item.get("bike_id"):
            db.add(
                StravaGearMapping(
                    connection_id=conn.id,
                    gear_id=item["gear_id"],
                    bike_id=item["bike_id"],
                )
            )
    conn.default_bike_id = default_bike_id
    conn.updated_at = datetime.utcnow()
    db.commit()
