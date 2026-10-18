from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg://classsight:classsight@localhost:5432/classsight"
    )
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    s3_bucket_name: str = "classsight-attendance-photos"
    aws_region: str = "us-east-1"
    # Set only for an S3-compatible store such as the local SeaweedFS; unset means real AWS S3.
    s3_endpoint_url: str | None = None
    # Address browsers use for presigned photo links, when it differs from the one the
    # backend uses (e.g. local S3 is "s3:8333" inside Docker but "localhost:8333" outside).
    s3_public_endpoint_url: str | None = None

    # Also embed flipped/brighter/darker copies of each enrollment photo.
    enroll_augment: bool = False
    log_level: str = "INFO"

    cors_allowed_origins: list[str] = ["http://localhost:5173"]

    @field_validator("s3_endpoint_url", "s3_public_endpoint_url", mode="before")
    @classmethod
    def _empty_means_unset(cls, value: str | None) -> str | None:
        # docker compose passes unset variables as "", which must mean "use AWS S3".
        return value or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
