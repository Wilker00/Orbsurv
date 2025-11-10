import pytest


@pytest.mark.asyncio
async def test_waitlist_submission(client):
    payload = {"email": "waitlist@example.com", "name": "Test User", "source": "web"}
    response = await client.post("/api/v1/waitlist", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_contact_submission(client):
    payload = {"name": "Security Lead", "email": "security@example.com", "message": "Need info."}
    response = await client.post("/api/v1/contact", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_investor_interest(client):
    payload = {"name": "Investor", "email": "invest@example.com", "amount": ""}
    response = await client.post("/api/v1/investor_interest", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_pilot_request(client):
    payload = {
        "name": "Ops Manager",
        "org": "Factory",
        "email": "ops@example.com",
        "use_case": "Perimeter monitoring",
    }
    response = await client.post("/api/v1/pilot_request", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_client_error_reporting(client):
    payload = {
        "message": "ReferenceError: foo is not defined",
        "stack": "ReferenceError: foo is not defined at Object.<anonymous> (app.js:10:5)",
        "url": "https://app.example.com/dashboard",
        "line": 10,
        "column": 5,
        "user_agent": "pytest-agent",
    }
    response = await client.post("/api/v1/client_errors", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_password_reset_email_skips_without_smtp():
    from backend.services.email import send_password_reset_email

    result = await send_password_reset_email(
        to="user@example.com",
        reset_url="https://example.com/reset?token=abc",
    )
    assert result is False
