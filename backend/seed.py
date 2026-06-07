#!/usr/bin/env python3
"""
Seed script — creates a demo user with one road bike and realistic maintenance history.

Run from the /backend directory after migrations have been applied:
    python seed.py

Demo credentials:
    email:    demo@upkeep.app
    password: demo1234
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env so DATABASE_URL etc. are available
from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import SessionLocal  # noqa: E402
from app.models import Component, MaintenanceLog, User  # noqa: E402
from app.models.bike import BikeType  # noqa: E402
from app.models.service_interval import IntervalType, ServiceInterval  # noqa: E402
from app.schemas.bike import BikeCreate  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402
from app.services.bike_service import create_bike_with_presets  # noqa: E402


def seed() -> None:
    db = SessionLocal()
    try:
        demo_email = "demo@upkeep.app"
        if db.query(User).filter(User.email == demo_email).first():
            print("Seed data already present — skipping.")
            return

        # ── User ──────────────────────────────────────────────────────────────
        user = User(
            email=demo_email,
            password_hash=hash_password("demo1234"),
            name="Demo Cyclist",
        )
        db.add(user)
        db.flush()

        # ── Bike ──────────────────────────────────────────────────────────────
        bike = create_bike_with_presets(
            db,
            user.id,
            BikeCreate(
                name="Canyon Ultimate CF SLX",
                type=BikeType.road,
                brand="Canyon",
                model="Ultimate CF SLX",
                year=2022,
                total_km=4250.0,
            ),
        )
        db.refresh(bike)

        def comp(name: str) -> Component:
            return next(c for c in bike.components if c.name == name)

        today = date.today()

        # ── Service intervals ─────────────────────────────────────────────────
        INTERVALS = [
            ("Kette",                   IntervalType.distance, None, 2500),
            ("Ritzelpaket / Kassette",  IntervalType.distance, None, 10_000),
            ("Bremsbeläge vorne",       IntervalType.both,     365,  5_000),
            ("Bremsbeläge hinten",      IntervalType.both,     365,  5_000),
            ("Reifen vorne",            IntervalType.distance, None, 8_000),
            ("Reifen hinten",           IntervalType.distance, None, 6_000),
            ("Bartape / Lenkerband",    IntervalType.time,     180,  None),
        ]
        for name, itype, days, km in INTERVALS:
            db.add(ServiceInterval(
                component_id=comp(name).id,
                interval_type=itype,
                interval_days=days,
                interval_km=km,
                reminder_days_before=14,
            ))

        # ── Maintenance logs ──────────────────────────────────────────────────
        # Chain — last service at 1 250 km, now at 4 250 km → 3 000 km since → OVERDUE (interval 2 500)
        db.add(MaintenanceLog(
            component_id=comp("Kette").id,
            performed_at=today - timedelta(days=45),
            odometer_km=1_250.0,
            description="Kette gewechselt (KMC X12 SL)",
            cost=34.90,
        ))

        # Cassette — serviced at 0, 10 000 km interval → OK
        db.add(MaintenanceLog(
            component_id=comp("Ritzelpaket / Kassette").id,
            performed_at=today - timedelta(days=400),
            odometer_km=0.0,
            description="Kassette ab Werk (Shimano 105)",
        ))

        # Tyres — installed at 0 km
        for tyre in ("Reifen vorne", "Reifen hinten"):
            db.add(MaintenanceLog(
                component_id=comp(tyre).id,
                performed_at=today - timedelta(days=180),
                odometer_km=0.0,
                description="Reifen ab Werk (Continental GP5000)",
            ))

        # Brake pads — serviced recently → OK
        for bp in ("Bremsbeläge vorne", "Bremsbeläge hinten"):
            db.add(MaintenanceLog(
                component_id=comp(bp).id,
                performed_at=today - timedelta(days=60),
                odometer_km=2_000.0,
                description="Bremsbeläge geprüft und neu eingestellt",
            ))

        # Bar tape — last done 200 days ago, interval 180 days → OVERDUE
        db.add(MaintenanceLog(
            component_id=comp("Bartape / Lenkerband").id,
            performed_at=today - timedelta(days=200),
            odometer_km=800.0,
            description="Lenkerband gewechselt (Fizik Terra Microtex)",
            cost=22.00,
        ))

        db.commit()
        print("✓  Seed complete.")
        print("   Email:    demo@upkeep.app")
        print("   Password: demo1234")
        print(f"   Bike:     {bike.name}  ({bike.total_km} km)")

    except Exception as exc:
        db.rollback()
        print(f"✗  Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
