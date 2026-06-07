"""
Pure unit tests for due_service.check_component.
No database, no HTTP — only Python logic.
"""
from datetime import date, timedelta
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.models.service_interval import IntervalType
from app.schemas.due import DueStatus
from app.services.due_service import check_component

TODAY = date.today()

INTERVAL_ID = UUID("00000000-0000-0000-0000-000000000001")
COMPONENT_ID = UUID("00000000-0000-0000-0000-000000000002")


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_interval(itype: IntervalType, *, days: int | None = None,
                  km: int | None = None, reminder: int = 14):
    return SimpleNamespace(
        id=INTERVAL_ID, component_id=COMPONENT_ID,
        interval_type=itype,
        interval_days=days,
        interval_km=km,
        reminder_days_before=reminder,
    )


def make_log(days_ago: int, odometer_km: float = 0.0):
    return SimpleNamespace(
        performed_at=TODAY - timedelta(days=days_ago),
        odometer_km=odometer_km,
    )


def make_component(*, interval=None, logs=None):
    return SimpleNamespace(
        id=COMPONENT_ID, name="Chain", category="drivetrain",
        service_interval=interval,
        maintenance_logs=logs or [],
    )


# ── No interval configured ────────────────────────────────────────────────────

def test_no_interval_returns_none():
    assert check_component(make_component(interval=None), 1000, TODAY) is None


# ── needs_first_service ───────────────────────────────────────────────────────

def test_no_logs_distance_interval_needs_first_service():
    comp = make_component(interval=make_interval(IntervalType.distance, km=2500))
    result = check_component(comp, 500, TODAY)
    assert result.status == DueStatus.needs_first_service
    assert result.days_since_service is None
    assert result.km_since_service is None


def test_no_logs_time_interval_needs_first_service():
    comp = make_component(interval=make_interval(IntervalType.time, days=180))
    result = check_component(comp, 0, TODAY)
    assert result.status == DueStatus.needs_first_service


# ── Distance interval ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("bike_km,expected", [
    (100,   None),                     # well within interval
    (2249,  None),                     # just below the 10 % reminder threshold (2500*0.9=2250)
    (2300,  DueStatus.due_soon),       # inside reminder window
    (2499,  DueStatus.due_soon),       # right before the limit
    (2500,  DueStatus.overdue),        # exactly at limit
    (3000,  DueStatus.overdue),        # well past limit
])
def test_distance_interval_statuses(bike_km, expected):
    comp = make_component(
        interval=make_interval(IntervalType.distance, km=2500),
        logs=[make_log(10, odometer_km=0)],
    )
    result = check_component(comp, bike_km, TODAY)
    assert (result.status if result else None) == expected


def test_distance_due_soon_km_until_due_is_correct():
    comp = make_component(
        interval=make_interval(IntervalType.distance, km=2500),
        logs=[make_log(10, odometer_km=0)],
    )
    result = check_component(comp, 2300, TODAY)
    assert result.km_since_service == 2300.0
    assert result.km_until_due == 200.0   # 2500 - 2300


def test_distance_overdue_km_until_due_is_negative():
    comp = make_component(
        interval=make_interval(IntervalType.distance, km=2500),
        logs=[make_log(10, odometer_km=0)],
    )
    result = check_component(comp, 3000, TODAY)
    assert result.km_until_due == -500.0  # 2500 - 3000


# ── Time interval ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("days_ago,expected", [
    (10,  None),                       # well within interval
    (165, None),                       # just below reminder window (180-14=166)
    (170, DueStatus.due_soon),         # inside 14-day reminder window
    (180, DueStatus.overdue),          # exactly at limit
    (200, DueStatus.overdue),          # past limit
])
def test_time_interval_statuses(days_ago, expected):
    comp = make_component(
        interval=make_interval(IntervalType.time, days=180, reminder=14),
        logs=[make_log(days_ago)],
    )
    result = check_component(comp, 0, TODAY)
    assert (result.status if result else None) == expected


def test_time_due_soon_days_until_due_correct():
    comp = make_component(
        interval=make_interval(IntervalType.time, days=180, reminder=14),
        logs=[make_log(170)],  # 10 days left
    )
    result = check_component(comp, 0, TODAY)
    assert result.days_until_due == 10
    assert result.days_since_service == 170


def test_time_overdue_days_until_due_is_negative():
    comp = make_component(
        interval=make_interval(IntervalType.time, days=180),
        logs=[make_log(200)],  # 20 days overdue
    )
    result = check_component(comp, 0, TODAY)
    assert result.days_until_due == -20


# ── Both (time + distance) ────────────────────────────────────────────────────

def test_both_overdue_by_distance_only():
    comp = make_component(
        interval=make_interval(IntervalType.both, days=365, km=2500),
        logs=[make_log(10, odometer_km=0)],   # time OK, distance overdue
    )
    result = check_component(comp, 3000, TODAY)
    assert result.status == DueStatus.overdue


def test_both_overdue_by_time_only():
    comp = make_component(
        interval=make_interval(IntervalType.both, days=180, km=5000),
        logs=[make_log(200, odometer_km=0)],  # time overdue, distance OK
    )
    result = check_component(comp, 100, TODAY)
    assert result.status == DueStatus.overdue


def test_both_due_soon_by_distance_only():
    comp = make_component(
        interval=make_interval(IntervalType.both, days=365, km=2500, reminder=14),
        logs=[make_log(10, odometer_km=0)],   # time OK, distance due_soon
    )
    result = check_component(comp, 2300, TODAY)
    assert result.status == DueStatus.due_soon


def test_both_ok_when_both_within_interval():
    comp = make_component(
        interval=make_interval(IntervalType.both, days=365, km=5000, reminder=14),
        logs=[make_log(30, odometer_km=0)],
    )
    result = check_component(comp, 100, TODAY)
    assert result is None


# ── Multi-log: uses most-recent log ──────────────────────────────────────────

def test_uses_most_recent_log_not_oldest():
    """If multiple logs exist, the most recent one should be used for calculation."""
    comp = make_component(
        interval=make_interval(IntervalType.distance, km=2500),
        logs=[
            make_log(days_ago=200, odometer_km=0),      # old log at 0 km
            make_log(days_ago=5,   odometer_km=2400),   # recent log at 2 400 km
        ],
    )
    # Bike is at 2 500 km. Most recent log was at 2 400 km → only 100 km since → OK
    result = check_component(comp, 2500, TODAY)
    assert result is None
