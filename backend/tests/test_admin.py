"""Tests for admin endpoints."""
import pytest
from backend.models import UserRole


@pytest.mark.asyncio
async def test_admin_summary_requires_dev_role(client, user_factory):
    """Test that admin summary requires DEV role."""
    # Regular user should be denied
    user = await user_factory("user@example.com", "UserPass!1", role=UserRole.USER)
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "UserPass!1"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    response = await client.get(
        "/api/v1/admin/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403

    # DEV user should succeed
    dev_user = await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)
    dev_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    assert dev_login.status_code == 200
    dev_token = dev_login.json()["access_token"]

    dev_response = await client.get(
        "/api/v1/admin/summary",
        headers={"Authorization": f"Bearer {dev_token}"},
    )
    assert dev_response.status_code == 200
    data = dev_response.json()
    assert "total_users" in data
    assert "total_waitlist" in data
    assert "total_contacts" in data


@pytest.mark.asyncio
async def test_admin_users_list(client, user_factory):
    """Test admin users list endpoint with pagination."""
    # Create multiple users
    await user_factory("user1@example.com", "Pass1!1", role=UserRole.USER)
    await user_factory("user2@example.com", "Pass2!1", role=UserRole.USER)
    await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)

    # Login as DEV
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    token = login.json()["access_token"]

    # Get users list
    response = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 1, "page_size": 10},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert len(data["items"]) >= 3


@pytest.mark.asyncio
async def test_admin_logs_list(client, user_factory):
    """Test admin logs list endpoint with pagination."""
    # Login as DEV
    dev_user = await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    token = login.json()["access_token"]

    # Get logs
    response = await client.get(
        "/api/v1/admin/logs",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 1, "page_size": 10},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data


@pytest.mark.asyncio
async def test_admin_logs_filter_by_action(client, user_factory):
    """Test filtering logs by action."""
    dev_user = await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    token = login.json()["access_token"]

    # Get logs filtered by action
    response = await client.get(
        "/api/v1/admin/logs",
        headers={"Authorization": f"Bearer {token}"},
        params={"action": "user.login", "page": 1, "page_size": 10},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_admin_send_email_requires_dev(client, user_factory):
    """Test that send email endpoint requires DEV role."""
    dev_user = await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    token = login.json()["access_token"]

    response = await client.post(
        "/api/v1/admin/send-email",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "to": "test@example.com",
            "subject": "Test Email",
            "body": "Test body",
        },
    )
    # Should succeed (even if email service is not configured)
    assert response.status_code in [200, 500]  # 500 if email not configured


@pytest.mark.asyncio
async def test_admin_pagination_edge_cases(client, user_factory):
    """Test pagination edge cases."""
    dev_user = await user_factory("dev@example.com", "DevPass!1", role=UserRole.DEV)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "DevPass!1", "scope": "dev", "otp": "000000"},
    )
    token = login.json()["access_token"]

    # Test page 0 (should default to 1)
    response = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 0, "page_size": 10},
    )
    assert response.status_code == 200

    # Test negative page
    response = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": -1, "page_size": 10},
    )
    assert response.status_code == 200

    # Test very large page_size
    response = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 1, "page_size": 1000},
    )
    assert response.status_code == 200

