"""S3 storage for attendance session photos.

Uses the EC2 instance's IAM role for credentials (boto3's default credential
chain) rather than hardcoded keys, per the backend rules in
README-Guransh-Backend-Database.md.
"""

from __future__ import annotations

import uuid

import boto3

from app.core.config import get_settings


def _client():
    settings = get_settings()
    return boto3.client("s3", region_name=settings.aws_region)


def upload_session_photo(classroom_id: int, session_id: int, content: bytes, content_type: str) -> str:
    settings = get_settings()
    key = f"attendance/{classroom_id}/{session_id}/{uuid.uuid4().hex}.jpg"
    _client().put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"


def key_from_url(photo_url: str) -> str:
    """Extract the object key from a URL returned by `upload_session_photo`."""
    return photo_url.split(".amazonaws.com/", 1)[1]


def get_object_bytes(key: str) -> bytes:
    settings = get_settings()
    response = _client().get_object(Bucket=settings.s3_bucket_name, Key=key)
    return response["Body"].read()
