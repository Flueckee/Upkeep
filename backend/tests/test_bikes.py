"""Integration tests for bikes, components, logs, and intervals."""
from datetime import date, timedelta

from fastapi.testclient import TestClient


def today_iso() -> str:
    return date.today().isoformat()


def days_ago_iso(n: int) -> str:
    return (date.today() - timedelta(days=n)).isoformat()

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


# ── Bikes CRUD ────────────────────────────────────────────────────────────────

def test_create_bike(client: TestClient, auth_headers: dict):
    resp = client.post("/api/bikes", json={"name": "My Road Bike", "type": "road"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Road Bike"
    assert data["type"] == "road"
    assert data["total_km"] == 0.0


def test_create_bike_auto_creates_12_preset_components(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Preset Bike", "type": "gravel"}, headers=auth_headers).json()
    comps = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()
    assert len(comps) == 12
    assert all(c["is_preset"] for c in comps)


def test_list_bikes_only_returns_own_bikes(client: TestClient, auth_headers: dict):
    for i in range(3):
        client.post("/api/bikes", json={"name": f"Bike {i}", "type": "road"}, headers=auth_headers)
    resp = client.get("/api/bikes", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_get_bike_not_found_returns_404(client: TestClient, auth_headers: dict):
    resp = client.get(f"/api/bikes/{NONEXISTENT_ID}", headers=auth_headers)
    assert resp.status_code == 404


def test_update_bike(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Old Name", "type": "road"}, headers=auth_headers).json()
    resp = client.put(f"/api/bikes/{bike['id']}", json={"name": "New Name"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_update_odometer(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Odo Bike", "type": "road"}, headers=auth_headers).json()
    resp = client.patch(f"/api/bikes/{bike['id']}/odometer", json={"total_km": 1234.5}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total_km"] == 1234.5


def test_update_odometer_negative_rejected(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    resp = client.patch(f"/api/bikes/{bike['id']}/odometer", json={"total_km": -1}, headers=auth_headers)
    assert resp.status_code == 422


def test_delete_bike(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Delete Me", "type": "road"}, headers=auth_headers).json()
    assert client.delete(f"/api/bikes/{bike['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/bikes/{bike['id']}", headers=auth_headers).status_code == 404


def test_bikes_isolated_between_users(client: TestClient):
    h1 = {"Authorization": "Bearer " + client.post("/api/auth/register", json={
        "email": "u1@test.com", "password": "pass1234", "name": "U1"
    }).json()["access_token"]}
    h2 = {"Authorization": "Bearer " + client.post("/api/auth/register", json={
        "email": "u2@test.com", "password": "pass1234", "name": "U2"
    }).json()["access_token"]}

    bike = client.post("/api/bikes", json={"name": "U1 Bike", "type": "road"}, headers=h1).json()
    assert client.get(f"/api/bikes/{bike['id']}", headers=h2).status_code == 404


# ── Components ────────────────────────────────────────────────────────────────

def test_add_custom_component(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    resp = client.post(
        f"/api/bikes/{bike['id']}/components",
        json={"name": "Custom Part", "category": "other"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["is_preset"] is False

    all_comps = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()
    assert len(all_comps) == 13  # 12 presets + 1 custom


def test_update_component(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]
    resp = client.put(f"/api/components/{comp['id']}", json={"name": "Renamed"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"


# ── Maintenance Logs ──────────────────────────────────────────────────────────

def test_create_and_list_log(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]

    resp = client.post(f"/api/components/{comp_id}/logs", json={
        "performed_at": today_iso(),
        "odometer_km": 1000.0,
        "description": "Service done",
        "cost": 25.0,
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["description"] == "Service done"
    assert data["cost"] == 25.0
    assert "recorded_at" in data  # server-set, always present

    logs = client.get(f"/api/components/{comp_id}/logs", headers=auth_headers).json()
    assert len(logs) == 1
    assert logs[0]["description"] == "Service done"


def test_log_performed_at_future_rejected(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    resp = client.post(f"/api/components/{comp_id}/logs", json={
        "performed_at": (date.today() + timedelta(days=1)).isoformat(),
        "odometer_km": 100.0, "description": "Future",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_log_performed_at_too_old_rejected(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    resp = client.post(f"/api/components/{comp_id}/logs", json={
        "performed_at": days_ago_iso(8),
        "odometer_km": 100.0, "description": "Too old",
    }, headers=auth_headers)
    assert resp.status_code == 422


def test_log_delete_endpoint_does_not_exist(client: TestClient, auth_headers: dict):
    """Maintenance logs are immutable — no DELETE endpoint."""
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    log = client.post(f"/api/components/{comp_id}/logs", json={
        "performed_at": today_iso(), "odometer_km": 100.0, "description": "X"
    }, headers=auth_headers).json()
    resp = client.delete(f"/api/logs/{log['id']}", headers=auth_headers)
    assert resp.status_code == 405  # path exists but only GET is registered → 405


# ── Service Intervals ─────────────────────────────────────────────────────────

def test_create_interval(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]

    resp = client.post(f"/api/components/{comp_id}/interval", json={
        "interval_type": "distance", "interval_km": 2500
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["interval_km"] == 2500


def test_create_duplicate_interval_returns_409(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    payload = {"interval_type": "distance", "interval_km": 2500}
    client.post(f"/api/components/{comp_id}/interval", json=payload, headers=auth_headers)
    resp = client.post(f"/api/components/{comp_id}/interval", json=payload, headers=auth_headers)
    assert resp.status_code == 409


def test_interval_embedded_in_component_response(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    client.post(f"/api/components/{comp_id}/interval", json={
        "interval_type": "distance", "interval_km": 2500
    }, headers=auth_headers)

    comps = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()
    target = next(c for c in comps if c["id"] == comp_id)
    assert target["service_interval"] is not None
    assert target["service_interval"]["interval_km"] == 2500


# ── Due Soon Endpoint ─────────────────────────────────────────────────────────

def test_due_endpoint_empty_when_no_intervals(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    resp = client.get(f"/api/bikes/{bike['id']}/due", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_due_endpoint_returns_needs_first_service(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road"}, headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]
    client.post(f"/api/components/{comp_id}/interval", json={
        "interval_type": "distance", "interval_km": 2500
    }, headers=auth_headers)

    due = client.get(f"/api/bikes/{bike['id']}/due", headers=auth_headers).json()
    assert len(due) == 1
    assert due[0]["status"] == "needs_first_service"
    assert due[0]["id"] == comp_id


def test_due_endpoint_overdue_after_km_exceeded(client: TestClient, auth_headers: dict):
    bike = client.post("/api/bikes", json={"name": "Bike", "type": "road", "total_km": 3000},
                       headers=auth_headers).json()
    comp_id = client.get(f"/api/bikes/{bike['id']}/components", headers=auth_headers).json()[0]["id"]

    client.post(f"/api/components/{comp_id}/interval", json={
        "interval_type": "distance", "interval_km": 2500
    }, headers=auth_headers)
    # Log service at 0 km — now bike is at 3 000, so 3 000 km since service > 2 500 → overdue
    client.post(f"/api/components/{comp_id}/logs", json={
        "performed_at": today_iso(), "odometer_km": 0.0, "description": "Fresh"
    }, headers=auth_headers)

    due = client.get(f"/api/bikes/{bike['id']}/due", headers=auth_headers).json()
    assert len(due) == 1
    assert due[0]["status"] == "overdue"
