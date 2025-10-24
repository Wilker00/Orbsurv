import pytest

from backend.models import UserRole


@pytest.mark.asyncio
async def test_user_register_and_login(client):
    register_payload = {
        "name": "Ops",
        "email": "ops@example.com",
        "password": "Str0ngPass!",
        "organization": "OpsOrg",
    }
    register_response = await client.post("/api/v1/auth/register", json=register_payload)
    assert register_response.status_code == 201
    register_data = register_response.json()
    assert "access_token" in register_data
    assert "refresh_token" in register_data
    assert register_data["role"] == "user"

    login_response = await client.post("/api/v1/auth/login", json={"email": "ops@example.com", "password": "Str0ngPass!"})
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert data["role"] == "user"

    refresh_response = await client.post("/api/v1/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert refresh_response.status_code == 200


@pytest.mark.asyncio
async def test_dev_login_requires_otp(client, user_factory):
    await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)

    fail_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "111111"},
    )
    assert fail_response.status_code == 400

    success_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "dev@example.com",
            "password": "DevPass!1",
            "scope": "dev",
            "otp": "000000",
        },
    )
    assert success_response.status_code == 200
    assert success_response.json()["role"] == "dev"


@pytest.mark.asyncio
async def test_password_reset_request(client, user_factory):
    await user_factory("reset@example.com", "ResetPass!1")

    success_response = await client.post("/api/v1/auth/password/forgot", json={"email": "reset@example.com"})
    assert success_response.status_code == 202
    assert "reset instructions" in success_response.json()["message"].lower()

    # Non-existent accounts should still return 202 to avoid leaking user existence
    unknown_response = await client.post("/api/v1/auth/password/forgot", json={"email": "unknown@example.com"})
    assert unknown_response.status_code == 202


@pytest.mark.asyncio
async def test_password_reset_confirm(client, user_factory):
    user = await user_factory("confirm@example.com", "OriginalPass!1")

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "confirm@example.com", "password": "OriginalPass!1"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["refresh_token"]

    request_token = await client.post(
        "/api/v1/auth/password/forgot",
        json={"email": "confirm@example.com"},
    )
    assert request_token.status_code == 202

    from backend.security import create_password_reset_token

    reset_token = create_password_reset_token(user)

    response = await client.post(
        "/api/v1/auth/password/reset",
        json={"token": reset_token, "new_password": "NewPass!2"},
    )
    assert response.status_code == 200
    assert "password updated" in response.json()["message"].lower()
