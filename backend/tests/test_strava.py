"""Tests for the Strava integration.

HTTP calls to Strava are mocked via monkeypatch on ``strava_client``. Most logic
is exercised at the service layer with a real (test) DB session; the webhook
validation handshake is tested through the HTTP endpoint.
"""
import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from app.models.bike import Bike, BikeType
from app.models.strava_activity import StravaImportedActivity
from app.models.strava_connection import StravaConnection
from app.models.strava_gear_mapping import StravaGearMapping
from app.models.user import User
from app.services import strava_client, strava_service


@pytest.fixture()
def db(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.close()
    with test_engine.connect() as conn:
        conn.execute(text(
            "TRUNCATE strava_imported_activities, strava_gear_mappings, strava_connections, "
            "service_intervals, maintenance_logs, components, bikes, users CASCADE"
        ))
        conn.commit()


def _make_user(db) -> User:
    user = User(email=f"{uuid.uuid4().hex}@t.app", password_hash="x", name="T")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _make_bike(db, user, km=0.0) -> Bike:
    bike = Bike(user_id=user.id, name="Bike", type=BikeType.road, total_km=km)
    db.add(bike)
    db.commit()
    db.refresh(bike)
    return bike


def _make_connection(db, user, default_bike=None) -> StravaConnection:
    conn = StravaConnection(
        user_id=user.id,
        athlete_id=999,
        access_token="acc",
        refresh_token="ref",
        expires_at=datetime.utcnow() + timedelta(hours=1),
        default_bike_id=default_bike.id if default_bike else None,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def _activity(activity_id=1, distance=10000, gear_id="b1", type_="Ride"):
    return {"id": activity_id, "distance": distance, "gear_id": gear_id, "type": type_}


# ── Idempotency ──────────────────────────────────────────────────────────────

def test_create_applies_km_once(db):
    user = _make_user(db)
    bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=bike)

    act = _activity(distance=10000, gear_id=None)
    strava_service.apply_activity_create(db, conn, act)
    db.refresh(bike)
    assert bike.total_km == pytest.approx(10.0)  # 10000 m → 10 km

    # Re-import the same activity → no change.
    strava_service.apply_activity_create(db, conn, act)
    db.refresh(bike)
    assert bike.total_km == pytest.approx(10.0)
    assert db.query(StravaImportedActivity).count() == 1


# ── Gear → bike mapping ──────────────────────────────────────────────────────

def test_mapped_gear_goes_to_mapped_bike(db):
    user = _make_user(db)
    default_bike = _make_bike(db, user)
    mapped_bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=default_bike)
    db.add(StravaGearMapping(connection_id=conn.id, gear_id="b1", bike_id=mapped_bike.id))
    db.commit()

    strava_service.apply_activity_create(db, conn, _activity(gear_id="b1", distance=5000))
    db.refresh(mapped_bike)
    db.refresh(default_bike)
    assert mapped_bike.total_km == pytest.approx(5.0)
    assert default_bike.total_km == pytest.approx(0.0)


def test_unmapped_gear_falls_back_to_default(db):
    user = _make_user(db)
    default_bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=default_bike)

    strava_service.apply_activity_create(db, conn, _activity(gear_id="unknown", distance=7000))
    db.refresh(default_bike)
    assert default_bike.total_km == pytest.approx(7.0)


def test_no_default_no_mapping_skips(db):
    user = _make_user(db)
    bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=None)

    strava_service.apply_activity_create(db, conn, _activity(gear_id="x", distance=9000))
    db.refresh(bike)
    assert bike.total_km == pytest.approx(0.0)
    assert db.query(StravaImportedActivity).count() == 0


def test_ignored_gear_skips(db):
    user = _make_user(db)
    default_bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=default_bike)
    db.add(StravaGearMapping(connection_id=conn.id, gear_id="trainer", bike_id=None))
    db.commit()

    strava_service.apply_activity_create(db, conn, _activity(gear_id="trainer", distance=9000))
    db.refresh(default_bike)
    assert default_bike.total_km == pytest.approx(0.0)


def test_non_ride_is_skipped(db):
    user = _make_user(db)
    bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=bike)

    strava_service.apply_activity_create(
        db, conn, _activity(type_="Run", distance=10000, gear_id=None)
    )
    db.refresh(bike)
    assert bike.total_km == pytest.approx(0.0)


# ── Update / delete ──────────────────────────────────────────────────────────

def test_update_adjusts_difference(db):
    user = _make_user(db)
    bike = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=bike)

    strava_service.apply_activity_create(db, conn, _activity(distance=10000, gear_id=None))
    strava_service.apply_activity_update(db, conn, _activity(distance=15000, gear_id=None))
    db.refresh(bike)
    assert bike.total_km == pytest.approx(15.0)  # not 25
    assert db.query(StravaImportedActivity).count() == 1


def test_update_moves_to_new_bike(db):
    user = _make_user(db)
    bike_a = _make_bike(db, user)
    bike_b = _make_bike(db, user)
    conn = _make_connection(db, user, default_bike=bike_a)
    db.add(StravaGearMapping(connection_id=conn.id, gear_id="b2", bike_id=bike_b.id))
    db.commit()

    strava_service.apply_activity_create(db, conn, _activity(distance=10000, gear_id=None))
    strava_service.apply_activity_update(db, conn, _activity(distance=10000, gear_id="b2"))
    db.refresh(bike_a)
    db.refresh(bike_b)
    assert bike_a.total_km == pytest.approx(0.0)
    assert bike_b.total_km == pytest.approx(10.0)


def test_delete_reverses(db):
    user = _make_user(db)
    bike = _make_bike(db, user, km=100.0)
    conn = _make_connection(db, user, default_bike=bike)

    strava_service.apply_activity_create(db, conn, _activity(distance=10000, gear_id=None))
    db.refresh(bike)
    assert bike.total_km == pytest.approx(110.0)

    strava_service.apply_activity_delete(db, conn, 1)
    db.refresh(bike)
    assert bike.total_km == pytest.approx(100.0)
    assert db.query(StravaImportedActivity).count() == 0


# ── Token refresh ────────────────────────────────────────────────────────────

def test_expired_token_is_refreshed(db, monkeypatch):
    user = _make_user(db)
    conn = _make_connection(db, user)
    conn.expires_at = datetime.utcnow() - timedelta(minutes=1)  # expired
    db.commit()

    new_expiry = int((datetime.utcnow() + timedelta(hours=6)).timestamp())
    called = {}

    def fake_refresh(refresh_token):
        called["token"] = refresh_token
        return {"access_token": "new_acc", "refresh_token": "new_ref", "expires_at": new_expiry}

    monkeypatch.setattr(strava_client, "refresh_access_token", fake_refresh)

    token = strava_service.get_valid_access_token(db, conn)
    assert token == "new_acc"
    assert called["token"] == "ref"
    db.refresh(conn)
    assert conn.refresh_token == "new_ref"


def test_valid_token_not_refreshed(db, monkeypatch):
    user = _make_user(db)
    conn = _make_connection(db, user)  # expires in 1h

    def boom(refresh_token):
        raise AssertionError("should not refresh a valid token")

    monkeypatch.setattr(strava_client, "refresh_access_token", boom)
    assert strava_service.get_valid_access_token(db, conn) == "acc"


# ── Webhook validation handshake (HTTP endpoint) ─────────────────────────────

def test_webhook_validation_ok(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.integrations.settings.strava_webhook_verify_token", "secret-tok"
    )
    resp = client.get(
        "/api/integrations/strava/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": "abc123",
            "hub.verify_token": "secret-tok",
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"hub.challenge": "abc123"}


def test_webhook_validation_bad_token(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.integrations.settings.strava_webhook_verify_token", "secret-tok"
    )
    resp = client.get(
        "/api/integrations/strava/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": "abc123",
            "hub.verify_token": "wrong",
        },
    )
    assert resp.status_code == 403


def test_status_requires_auth(client):
    assert client.get("/api/integrations/strava/status").status_code in (401, 403)
