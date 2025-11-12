import os
from functools import lru_cache
from typing import Annotated

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Correctly locate the .env file relative to this settings file
env_path = os.path.join(os.path.dirname(__file__), ".env")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=env_path, env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Orbsurv API"
    api_prefix: str = "/api/v1"

    database_url: Annotated[str, Field(validation_alias="DATABASE_URL")]

    jwt_secret_key: Annotated[str, Field(validation_alias="JWT_SECRET_KEY")]
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: Annotated[int, Field(validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")] = 30
    refresh_token_expire_minutes: Annotated[int, Field(validation_alias="REFRESH_TOKEN_EXPIRE_MINUTES")] = 60 * 24
    reset_token_expire_minutes: Annotated[int, Field(validation_alias="RESET_TOKEN_EXPIRE_MINUTES")] = 30

    cors_allow_origins: Annotated[list[str], Field(validation_alias="CORS_ALLOW_ORIGINS")] = ["http://localhost:5173"]

    env: Annotated[str, Field(validation_alias="ENV")] = "development"
    log_level: Annotated[str, Field(validation_alias="LOG_LEVEL")] = "INFO"

    redis_url: Annotated[str | None, Field(validation_alias="REDIS_URL")] = None
    dev_master_otp: Annotated[str | None, Field(validation_alias="DEV_MASTER_OTP")] = "000000"
    email_provider: Annotated[str | None, Field(validation_alias="EMAIL_PROVIDER")] = None
    email_api_key: Annotated[str | None, Field(validation_alias="EMAIL_API_KEY")] = None
    email_from_email: Annotated[str | None, Field(validation_alias="EMAIL_FROM_EMAIL")] = None
    email_from_name: Annotated[str | None, Field(validation_alias="EMAIL_FROM_NAME")] = None
    email_host: Annotated[str | None, Field(validation_alias="EMAIL_HOST")] = None
    email_port: Annotated[int | None, Field(validation_alias="EMAIL_PORT")] = None
    email_username: Annotated[str | None, Field(validation_alias="EMAIL_USER")] = None
    email_password: Annotated[str | None, Field(validation_alias="EMAIL_PASS")] = None
    email_from: Annotated[str | None, Field(validation_alias="EMAIL_FROM")] = None
    frontend_base_url: Annotated[str | None, Field(validation_alias="FRONTEND_BASE_URL")] = None

    public_form_rate_limit: Annotated[int, Field(validation_alias="PUBLIC_FORM_RATE_LIMIT")] = 5
    public_form_rate_window_seconds: Annotated[int, Field(validation_alias="PUBLIC_FORM_RATE_WINDOW_SECONDS")] = 600
    client_error_rate_limit: Annotated[int, Field(validation_alias="CLIENT_ERROR_RATE_LIMIT")] = 20
    client_error_rate_window_seconds: Annotated[
        int, Field(validation_alias="CLIENT_ERROR_RATE_WINDOW_SECONDS")
    ] = 60

    captcha_provider: Annotated[str | None, Field(validation_alias="CAPTCHA_PROVIDER")] = "hcaptcha"
    captcha_secret_key: Annotated[str | None, Field(validation_alias="CAPTCHA_SECRET_KEY")] = None
    captcha_verify_url: Annotated[
        str | None, Field(validation_alias="CAPTCHA_VERIFY_URL")
    ] = "https://hcaptcha.com/siteverify"
    captcha_required_for_public_forms: Annotated[
        bool, Field(validation_alias="CAPTCHA_REQUIRED_FOR_PUBLIC_FORMS")
    ] = False

    sentry_dsn: Annotated[str | None, Field(validation_alias="SENTRY_DSN")] = None
    sentry_traces_sample_rate: Annotated[
        float, Field(validation_alias="SENTRY_TRACES_SAMPLE_RATE", ge=0.0, le=1.0)
    ] = 0.0
    sentry_profiles_sample_rate: Annotated[
        float, Field(validation_alias="SENTRY_PROFILES_SAMPLE_RATE", ge=0.0, le=1.0)
    ] = 0.0

    docs_url: str | None = "/docs"
    redoc_url: str | None = None

    @model_validator(mode="after")
    def _normalize_lists(self):
        if isinstance(self.cors_allow_origins, str):
            origins = [item.strip() for item in self.cors_allow_origins.split(",") if item.strip()]
            object.__setattr__(self, "cors_allow_origins", origins)
        test_context = bool(os.environ.get("PYTEST_CURRENT_TEST"))
        allow_insecure = os.environ.get("ORBSURV_ALLOW_INSECURE_SETTINGS") == "1"
        if self.captcha_required_for_public_forms and not self.captcha_secret_key and not allow_insecure:
            raise ValueError("CAPTCHA_SECRET_KEY must be configured when captcha enforcement is enabled.")
        if self.env.lower() == "production" and not (test_context or allow_insecure):
            if not self.captcha_secret_key:
                raise ValueError("CAPTCHA_SECRET_KEY must be configured in production.")
            if not self.sentry_dsn:
                raise ValueError("SENTRY_DSN must be configured in production.")
            object.__setattr__(self, "captcha_required_for_public_forms", True)
        elif allow_insecure and self.env.lower() == "production" and not self.captcha_secret_key:
            object.__setattr__(self, "captcha_required_for_public_forms", False)
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
