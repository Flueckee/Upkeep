"""
Shared pytest fixtures.

Test database: upkeep_test (created automatically if missing).
Each test gets a clean slate — all tables are truncated after the function runs.
"""
from urllib.parse import urlparse, urlunparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app


def _admin_url(db_url: str) -> str:
    """Swap the DB name to 'postgres' for admin-level DDL."""
    p = urlparse(db_url)
    return urlunparse(p._replace(path="/postgres"))


def _test_url(db_url: str) -> str:
    """Swap the DB name to 'upkeep_test'."""
    p = urlparse(db_url)
    return urlunparse(p._replace(path="/upkeep_test"))


TEST_DB_URL = _test_url(settings.database_url)


def _ensure_test_db() -> None:
    engine = create_engine(_admin_url(settings.database_url), isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'upkeep_test'")
        ).fetchone()
        if not exists:
            conn.execute(text("CREATE DATABASE upkeep_test"))
    engine.dispose()


@pytest.fixture(scope="session")
def test_engine():
    """Create the test DB + schema once per test session; drop everything at the end."""
    _ensure_test_db()
    engine = create_engine(TEST_DB_URL)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(test_engine):
    """
    FastAPI TestClient with get_db overridden to use the test DB.
    All tables are truncated after each test so tests are fully isolated.
    """
    TestSession = sessionmaker(bind=test_engine)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

    # Truncate in FK-safe order after the test
    with test_engine.connect() as conn:
        conn.execute(text(
            "TRUNCATE strava_imported_activities, strava_gear_mappings, strava_connections, "
            "service_intervals, maintenance_logs, components, bikes, users CASCADE"
        ))
        conn.commit()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Register + log in a test user and return Authorization headers."""
    client.post("/api/auth/register", json={
        "email": "test@upkeep.app",
        "password": "testpass123",
        "name": "Test User",
    })
    resp = client.post("/api/auth/login", json={
        "email": "test@upkeep.app",
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
