"""Integration tests for /api/auth/* endpoints."""
import pytest
from fastapi.testclient import TestClient


_USER = {"email": "auth@test.com", "password": "pass1234", "name": "Auth User"}


# ── Register ──────────────────────────────────────────────────────────────────

def test_register_returns_token(client: TestClient):
    resp = client.post("/api/auth/register", json=_USER)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email_returns_409(client: TestClient):
    client.post("/api/auth/register", json=_USER)
    resp = client.post("/api/auth/register", json=_USER)
    assert resp.status_code == 409


def test_register_missing_fields_returns_422(client: TestClient):
    resp = client.post("/api/auth/register", json={"email": "x@x.com"})
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_returns_token(client: TestClient):
    client.post("/api/auth/register", json=_USER)
    resp = client.post("/api/auth/login", json={
        "email": _USER["email"], "password": _USER["password"]
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_returns_401(client: TestClient):
    client.post("/api/auth/register", json=_USER)
    resp = client.post("/api/auth/login", json={
        "email": _USER["email"], "password": "wrongpassword"
    })
    assert resp.status_code == 401


def test_login_unknown_email_returns_401(client: TestClient):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@test.com", "password": "anything"
    })
    assert resp.status_code == 401


# ── /me ───────────────────────────────────────────────────────────────────────

def test_me_returns_current_user(client: TestClient, auth_headers: dict):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@upkeep.app"
    assert data["name"] == "Test User"
    assert "id" in data
    assert "password_hash" not in data  # never leak the hash


def test_me_without_token_returns_403(client: TestClient):
    # HTTPBearer raises 403 when no Authorization header is present
    resp = client.get("/api/auth/me")
    assert resp.status_code == 403


def test_me_with_invalid_token_returns_401(client: TestClient):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert resp.status_code == 401
