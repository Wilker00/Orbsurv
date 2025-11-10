from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .models import UserRole, OrderStatus


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=5000)


class WaitlistCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    email: EmailStr
    source: Optional[str] = Field(default=None, max_length=255)


class InvestorInterestCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    amount: Optional[str] = Field(default=None, max_length=255)
    note: Optional[str] = Field(default=None, max_length=5000)


class PilotRequestCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    org: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    use_case: str = Field(..., min_length=5, max_length=5000)


class UserCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    organization: Optional[str] = Field(default=None, max_length=255)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str]
    organization: Optional[str]
    role: UserRole
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    scope: str = Field(default="user")
    otp: Optional[str] = Field(default=None, min_length=6, max_length=6)


class AuthRegisterResponse(BaseModel):
    message: str = "Account created."


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    user: UserOut


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class LogoutResponse(BaseModel):
    message: str = "Logged out"


class MessageResponse(BaseModel):
    status: str = "ok"
    message: str


class ClientErrorReport(BaseModel):
    message: str = Field(..., max_length=2000)
    stack: Optional[str] = Field(default=None, max_length=8000)
    url: Optional[str] = Field(default=None, max_length=2000)
    user_agent: Optional[str] = Field(default=None, max_length=1000)
    line: Optional[int] = None
    column: Optional[int] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)


class AccountProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = None
    organization: Optional[str] = Field(default=None, max_length=255)


class AccountPasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)


class AccountOrganizationUpdate(BaseModel):
    organization: str = Field(..., max_length=255)
    timezone: Optional[str] = Field(default=None, max_length=100)


class NotificationSettingsUpdate(BaseModel):
    alert_email: Optional[EmailStr] = None
    sms_stage: bool = False
    weekly_summary: bool = False


class AutomationSettingsUpdate(BaseModel):
    default_patrol: Optional[str] = None
    auto_reengage: bool = False


class SettingsResponse(BaseModel):
    notifications: NotificationSettingsUpdate
    automation: AutomationSettingsUpdate


class DashboardMetrics(BaseModel):
    active_alerts: int = 0
    rails_online: int = 0
    downtime_minutes: int = 0


class DashboardLog(BaseModel):
    id: int
    action: str
    description: Optional[str]
    created_at: datetime


class DashboardSummary(BaseModel):
    metrics: DashboardMetrics
    recent_logs: list[DashboardLog]
    command_center_url: Optional[str] = None


class AdminSummary(BaseModel):
    total_users: int
    total_contacts: int
    total_waitlist: int
    total_pilot_requests: int
    total_investor_interest: int


class AdminLogEntry(BaseModel):
    id: int
    actor_email: Optional[str]
    role: Optional[UserRole]
    action: str
    path: Optional[str]
    ip: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int

    @classmethod
    def create(cls, page: int, limit: int, total: int) -> PaginationMeta:
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        return cls(page=page, limit=limit, total=total, total_pages=total_pages)


class AdminLogResponse(BaseModel):
    items: list[AdminLogEntry]
    pagination: PaginationMeta


class AdminUserSummary(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str]
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    items: list[AdminUserSummary]
    pagination: PaginationMeta


class AdminWaitlistItem(BaseModel):
    id: int
    name: Optional[str]
    email: EmailStr
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminContactItem(BaseModel):
    id: int
    name: str
    email: EmailStr
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class AdminPilotItem(BaseModel):
    id: int
    name: str
    org: str
    email: EmailStr
    use_case: str
    created_at: datetime

    class Config:
        from_attributes = True


class AdminInvestorItem(BaseModel):
    id: int
    name: str
    email: EmailStr
    amount: Optional[str]
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EmailSchema(BaseModel):
    to: EmailStr
    subject: str
    body: str


class AdminUserRoleUpdate(BaseModel):
    role: UserRole


class AdminWaitlistResponse(BaseModel):
    items: list[AdminWaitlistItem]
    pagination: PaginationMeta


class AdminContactResponse(BaseModel):
    items: list[AdminContactItem]
    pagination: PaginationMeta


class AdminPilotResponse(BaseModel):
    items: list[AdminPilotItem]
    pagination: PaginationMeta


class AdminInvestorResponse(BaseModel):
    items: list[AdminInvestorItem]
    pagination: PaginationMeta


class OrderCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    plan_type: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., gt=0)


class OrderResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    plan_type: str
    price: float
    status: OrderStatus
    registration_token: str
    created_at: datetime

    class Config:
        from_attributes = True


class RegistrationLinkRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=255)
    organization: Optional[str] = Field(default=None, max_length=255)

