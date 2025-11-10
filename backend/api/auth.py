import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_session
from ..middleware.rate_limit import rate_limit_middleware
from ..security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    record_audit_log,
    verify_password,
)
from ..services.email import send_password_reset_email
from ..settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenPair, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: schemas.UserCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.TokenPair:
    # Rate limit: 5 registrations per 15 minutes per IP
    await rate_limit_middleware(request, max_requests=5, window_seconds=900)
    existing = await crud.users.get_by_email(session, email=payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = await crud.users.create_user(session, payload=payload)
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    await record_audit_log(session, actor=user, action="auth.register", request=request)
    await session.commit()
    return schemas.TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/register-from-order", response_model=schemas.TokenPair, status_code=status.HTTP_201_CREATED)
async def register_from_order(
    payload: schemas.RegistrationLinkRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.TokenPair:
    """Register a user account from an order registration token."""
    # Rate limit: 5 registrations per 15 minutes per IP
    await rate_limit_middleware(request, max_requests=5, window_seconds=900)
    
    # Find order by token
    order = await crud.order.get_order_by_token(session, payload.token)
    if not order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired registration token")
    
    # Check if order is already linked to a user
    if order.user_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This registration link has already been used")
    
    # Check if user already exists
    existing = await crud.users.get_by_email(session, email=order.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered. Please log in instead.")
    
    # Create user account
    user_payload = schemas.UserCreate(
        email=order.email,
        password=payload.password,
        name=payload.name or order.name,
        organization=payload.organization,
    )
    user = await crud.users.create_user(session, payload=user_payload)
    
    # Link order to user
    await crud.order.link_order_to_user(session, order, user)
    
    # Generate tokens
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    
    await record_audit_log(session, actor=user, action="auth.register.from_order", request=request)
    await session.commit()
    
    return schemas.TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.TokenPair)
async def login_user(
    payload: schemas.AuthLoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.TokenPair:
    # Rate limit: 5 login attempts per 15 minutes per IP/email
    await rate_limit_middleware(
        request, max_requests=5, window_seconds=900, email=payload.email
    )
    
    user = await crud.users.get_by_email(session, email=payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email or password")

    scope = payload.scope or "user"
    if scope == "dev":
        if user.role != models.UserRole.DEV:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dev access required")
        if settings.dev_master_otp and payload.otp != settings.dev_master_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid one-time code")

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    await record_audit_log(session, actor=user, action=f"auth.login.{scope}", request=request)
    await session.commit()

    return schemas.TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/password/forgot", response_model=schemas.MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def password_reset_request(
    payload: schemas.PasswordResetRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    # Rate limit: 3 password reset requests per hour per IP/email
    await rate_limit_middleware(
        request, max_requests=3, window_seconds=3600, email=payload.email
    )
    user = await crud.users.get_by_email(session, email=payload.email)
    if user:
        token = create_password_reset_token(user)
        base_url = (settings.frontend_base_url or "https://app.orbsurv.com").rstrip("/")
        reset_url = f"{base_url}/reset-password.html?token={token}"
        success = await send_password_reset_email(to=user.email, reset_url=reset_url)
        if not success:
            logger.warning("Unable to deliver password reset email for %s", user.email)
        await record_audit_log(session, actor=user, action="auth.password.reset.requested", request=request)
        await session.commit()
    return schemas.MessageResponse(message="If an account exists, reset instructions are on the way.")


@router.post("/password/reset", response_model=schemas.MessageResponse)
async def password_reset_confirm(
    payload: schemas.PasswordResetConfirm,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    try:
        token_data = decode_token(payload.token)
    except HTTPException as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token") from exc

    if token_data.get("type") != "reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    email = token_data.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token payload")

    user = await crud.users.get_by_email(session, email=email)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    if user.token_version != token_data.get("token_version"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")

    await crud.users.update_password(session, user=user, new_password=payload.new_password)
    await record_audit_log(session, actor=user, action="auth.password.reset.confirm", request=request)
    await session.commit()
    return schemas.MessageResponse(message="Password updated. You can now log in.")


@router.post("/refresh", response_model=schemas.TokenPair)
async def refresh_token(
    payload: schemas.TokenRefreshRequest,
    session: AsyncSession = Depends(get_session),
) -> schemas.TokenPair:
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refresh token")

    email = token_data.get("sub")
    result_user = await crud.users.get_by_email(session, email=email)
    if not result_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if result_user.token_version != token_data.get("token_version"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    access_token = create_access_token(result_user)
    refresh_token = create_refresh_token(result_user)

    return schemas.TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        role=result_user.role,
        user=schemas.UserOut.model_validate(result_user),
    )


@router.post("/logout", response_model=schemas.LogoutResponse)
async def logout_user(
    request: Request,
    user: models.User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> schemas.LogoutResponse:
    await crud.users.bump_token_version(session, user=user)
    await record_audit_log(session, actor=user, action="auth.logout", request=request)
    await session.commit()
    return schemas.LogoutResponse()


@router.get("/me", response_model=schemas.UserOut)
async def read_current_user(user: models.User = Depends(get_current_user)) -> schemas.UserOut:
    return schemas.UserOut.model_validate(user)
