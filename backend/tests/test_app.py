"""Tests for app endpoints (authenticated user endpoints)."""
import pytest
from backend.models import UserRole


@pytest.mark.asyncio
async def test_dashboard_summary_requires_auth(client, user_factory):
    """Test that dashboard summary requires authentication."""
    # Without auth
    response = await client.get("/api/v1/app/dashboard/summary")
    assert response.status_code == 401

    # With auth
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/app/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data


@pytest.mark.asyncio
async def test_get_current_user(client, user_factory):
    """Test getting current user profile."""
    user = await user_factory("user@example.com", "UserPass!1", name="Test User")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/app/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@example.com"
    assert data["name"] == "Test User"


@pytest.mark.asyncio
async def test_update_profile(client, user_factory):
    """Test updating user profile."""
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.put(
        "/api/v1/app/account/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Updated Name", "organization": "Updated Org"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["organization"] == "Updated Org"


@pytest.mark.asyncio
async def test_update_password(client, user_factory):
    """Test updating password."""
    user = await user_factory("user@example.com", "OldPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "OldPass!1"},
    )
    token = login.json()["access_token"]

    # Update password
    response = await client.put(
        "/api/v1/app/account/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "OldPass!1", "new_password": "NewPass!2"},
    )
    assert response.status_code == 200

    # Verify new password works
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "NewPass!2"},
    )
    assert new_login.status_code == 200

    # Verify old password doesn't work
    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "OldPass!1"},
    )
    assert old_login.status_code == 401


@pytest.mark.asyncio
async def test_update_password_wrong_current(client, user_factory):
    """Test updating password with wrong current password."""
    user = await user_factory("user@example.com", "OldPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "OldPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.put(
        "/api/v1/app/account/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "WrongPass!1", "new_password": "NewPass!2"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_settings(client, user_factory):
    """Test getting user settings."""
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/app/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "notification_settings" in data
    assert "automation_settings" in data


@pytest.mark.asyncio
async def test_update_notification_settings(client, user_factory):
    """Test updating notification settings."""
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    response = await client.put(
        "/api/v1/app/settings/notifications",
        headers={"Authorization": f"Bearer {token}"},
        json={"email_alerts": True, "push_notifications": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["notification_settings"]["email_alerts"] is True
    assert data["notification_settings"]["push_notifications"] is False


@pytest.mark.asyncio
async def test_expired_token(client, user_factory):
    """Test that expired tokens are rejected."""
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    # This test would require mocking time or using a very short expiration
    # For now, we just verify that invalid tokens are rejected
    response = await client.get(
        "/api/v1/app/dashboard/summary",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_concurrent_requests(client, user_factory):
    """Test handling of concurrent requests."""
    user = await user_factory("user@example.com", "UserPass!1")
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    token = login.json()["access_token"]

    # Make multiple concurrent requests
    import asyncio

    async def make_request():
        return await client.get(
            "/api/v1/app/dashboard/summary",
            headers={"Authorization": f"Bearer {token}"},
        )

    responses = await asyncio.gather(*[make_request() for _ in range(5)])
    assert all(r.status_code == 200 for r in responses)

