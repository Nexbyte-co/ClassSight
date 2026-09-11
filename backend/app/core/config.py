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


@lru_cache
def get_settings() -> Settings:
    return Settings()
