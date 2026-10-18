from functools import lru_cache

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
    # Set only for an S3-compatible store such as local MinIO; unset means real AWS S3.
    s3_endpoint_url: str | None = None

    # Also embed flipped/brighter/darker copies of each enrollment photo.
    enroll_augment: bool = False
    log_level: str = "INFO"

    cors_allowed_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
