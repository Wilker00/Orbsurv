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
    frontend_base_url: Annotated[str | None, Field(validation_alias="FRONTEND_BASE_URL")] = None

    docs_url: str | None = "/docs"
    redoc_url: str | None = None

    @model_validator(mode="after")
    def _normalize_lists(self):
        if isinstance(self.cors_allow_origins, str):
            origins = [item.strip() for item in self.cors_allow_origins.split(",") if item.strip()]
            object.__setattr__(self, "cors_allow_origins", origins)
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
