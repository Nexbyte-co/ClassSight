import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://classsight:classsight@localhost:5432/classsight_test",
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Classroom, Student, User, UserRole

engine = create_engine(os.environ["DATABASE_URL"])
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(autouse=True)
def _reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def _get_test_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    user = User(
        name="Admin",
        email="admin@classsight.example",
        password_hash=hash_password("adminpass123"),
        role=UserRole.ADMIN,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def teacher_user(db_session):
    user = User(
        name="Teacher One",
        email="teacher1@classsight.example",
        password_hash=hash_password("teacherpass123"),
        role=UserRole.TEACHER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_teacher_user(db_session):
    user = User(
        name="Teacher Two",
        email="teacher2@classsight.example",
        password_hash=hash_password("teacherpass123"),
        role=UserRole.TEACHER,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def classroom(db_session, teacher_user):
    room = Classroom(course="CS101", section="A", teacher_id=teacher_user.id)
    db_session.add(room)
    db_session.commit()
    db_session.refresh(room)
    return room


@pytest.fixture
def student(db_session, classroom):
    s = Student(roll_number="R001", name="Alice", classroom_id=classroom.id)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)
    return s


def auth_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class FakeS3Client:
    """In-memory stand-in for the boto3 S3 client used by app.services.s3_service."""

    def __init__(self):
        self.objects: dict[str, bytes] = {}
        self.fail = False

    def _check(self):
        if self.fail:
            from botocore.exceptions import EndpointConnectionError

            raise EndpointConnectionError(endpoint_url="http://fake-s3")

    def put_object(self, Bucket, Key, Body, ContentType):
        self._check()
        self.objects[Key] = Body

    def get_object(self, Bucket, Key):
        self._check()
        import io

        return {"Body": io.BytesIO(self.objects[Key])}

    def delete_objects(self, Bucket, Delete):
        self._check()
        for item in Delete["Objects"]:
            self.objects.pop(item["Key"], None)

    def generate_presigned_url(self, ClientMethod, Params, ExpiresIn):
        return f"https://fake-s3/{Params['Key']}?expires={ExpiresIn}"


@pytest.fixture
def fake_s3(monkeypatch):
    from app.services import s3_service

    client = FakeS3Client()
    monkeypatch.setattr(s3_service, "_client", lambda: client)
    return client
