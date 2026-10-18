from app.db.seed import seed_admin
from app.models import User, UserRole
from tests.conftest import auth_headers


def test_seed_creates_admin_that_can_log_in(client, db_session):
    generated = seed_admin(db_session, "root@classsight.example", "Root", password=None)
    assert generated

    user = db_session.query(User).filter(User.email == "root@classsight.example").one()
    assert user.role == UserRole.ADMIN
    auth_headers(client, "root@classsight.example", generated)


def test_seed_is_idempotent_and_keeps_existing_password(client, db_session):
    seed_admin(db_session, "root@classsight.example", "Root", password="firstpass123")
    assert seed_admin(db_session, "root@classsight.example", "Root", password="other") is None

    assert db_session.query(User).count() == 1
    auth_headers(client, "root@classsight.example", "firstpass123")
