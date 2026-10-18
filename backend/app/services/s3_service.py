"""S3 storage for attendance session photos and student enrollment photos.

Uses the EC2 instance's IAM role for credentials (boto3's default credential
chain) rather than hardcoded keys, per the backend rules in
README-Guransh-Backend-Database.md. The bucket is private: student photos are
only ever exposed through short-lived presigned URLs.
"""

from __future__ import annotations

import logging
import uuid

import boto3

from app.core.config import get_settings

logger = logging.getLogger(__name__)

PRESIGNED_URL_SECONDS = 300
_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png"}


def _client():
    settings = get_settings()
    return boto3.client(
        "s3", region_name=settings.aws_region, endpoint_url=settings.s3_endpoint_url
    )


def upload_session_photo(classroom_id: int, session_id: int, content: bytes, content_type: str) -> str:
    settings = get_settings()
    key = f"attendance/{classroom_id}/{session_id}/{uuid.uuid4().hex}.jpg"
    _client().put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    logger.info("s3 put %s (%d bytes)", key, len(content))
    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"


def upload_student_photo(roll_number: str, content: bytes, content_type: str) -> str:
    """Store one enrollment photo and return its object key."""
    settings = get_settings()
    key = f"students/{roll_number}/{uuid.uuid4().hex}.{_EXTENSIONS.get(content_type, 'jpg')}"
    _client().put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    logger.info("s3 put %s (%d bytes)", key, len(content))
    return key


def delete_objects(keys: list[str]) -> None:
    if not keys:
        return
    settings = get_settings()
    _client().delete_objects(
        Bucket=settings.s3_bucket_name,
        Delete={"Objects": [{"Key": key} for key in keys], "Quiet": True},
    )
    logger.info("s3 delete %d object(s): %s", len(keys), keys)


def presign(key: str, expires_in: int = PRESIGNED_URL_SECONDS) -> str:
    settings = get_settings()
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def key_from_url(photo_url: str) -> str:
    """Extract the object key from a URL returned by `upload_session_photo`."""
    return photo_url.split(".amazonaws.com/", 1)[1]


def get_object_bytes(key: str) -> bytes:
    settings = get_settings()
    response = _client().get_object(Bucket=settings.s3_bucket_name, Key=key)
    content = response["Body"].read()
    logger.info("s3 get %s (%d bytes)", key, len(content))
    return content
