from app.core.security import hash_password
from app.models import User, UserRole
from tests.conftest import auth_headers


def _second_admin(db_session):
    user = User(name="Admin Two", email="admin2@classsight.example",
                password_hash=hash_password("adminpass123"), role=UserRole.ADMIN)
    db_session.add(user)
    db_session.commit()
    return user


def _teacher(client):
    return auth_headers(client, "teacher1@classsight.example", "teacherpass123")


def _admin(client, email="admin@classsight.example"):
    return auth_headers(client, email, "adminpass123")


def _send(client, headers, kind="nfc_card"):
    r = client.post("/requests", json={"kind": kind, "subject": "2C21", "details": "Card not read"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_teacher_sends_request_and_admin_sees_it(client, admin_user, teacher_user):
    sent = _send(client, _teacher(client))
    assert sent["status"] == "open" and sent["teacher_name"] == "Teacher One"
    mine = client.get("/requests/mine", headers=_teacher(client)).json()
    assert [r["id"] for r in mine] == [sent["id"]]
    listed = client.get("/requests", headers=_admin(client)).json()
    assert [r["id"] for r in listed] == [sent["id"]]


def test_only_teachers_send_and_only_admins_list(client, admin_user, teacher_user):
    assert client.post("/requests", json={"kind": "other", "details": "x"}, headers=_admin(client)).status_code == 403
    assert client.get("/requests", headers=_teacher(client)).status_code == 403
    assert client.get("/activity", headers=_teacher(client)).status_code == 403
    assert client.post("/requests", json={"kind": "nope", "details": "x"}, headers=_teacher(client)).status_code == 422


def test_doing_locks_request_for_other_admins(client, admin_user, teacher_user, db_session):
    _second_admin(db_session)
    req = _send(client, _teacher(client))
    a1, a2 = _admin(client), _admin(client, "admin2@classsight.example")
    claimed = client.post(f"/requests/{req['id']}/claim", headers=a1).json()
    assert claimed["status"] == "in_progress" and claimed["claimed_by_name"] == "Admin"
    assert client.post(f"/requests/{req['id']}/claim", headers=a2).status_code == 409
    assert client.post(f"/requests/{req['id']}/resolve", headers=a2).status_code == 409
    assert client.post(f"/requests/{req['id']}/release", headers=a2).status_code == 409
    # The teacher can't withdraw it once an admin started.
    assert client.delete(f"/requests/{req['id']}", headers=_teacher(client)).status_code == 409
    assert client.post(f"/requests/{req['id']}/release", headers=a1).json()["status"] == "open"
    assert client.post(f"/requests/{req['id']}/claim", headers=a2).status_code == 200


def test_fixing_moves_request_to_recent_activity(client, admin_user, teacher_user):
    req = _send(client, _teacher(client), kind="face_reenroll")
    headers = _admin(client)
    fixed = client.post(f"/requests/{req['id']}/resolve", headers=headers).json()
    assert fixed["status"] == "fixed" and fixed["resolved_by_name"] == "Admin"
    assert client.get("/requests", headers=headers).json() == []
    assert client.post(f"/requests/{req['id']}/resolve", headers=headers).status_code == 409
    events = client.get("/activity", headers=headers).json()
    assert events[0]["kind"] == "request_fixed"
    assert "Enroll face again" in events[0]["title"]
    mine = client.get("/requests/mine", headers=_teacher(client)).json()
    assert mine[0]["status"] == "fixed"


def test_teacher_withdraws_open_request(client, teacher_user, other_teacher_user):
    req = _send(client, _teacher(client))
    other = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    assert client.delete(f"/requests/{req['id']}", headers=other).status_code == 404
    assert client.delete(f"/requests/{req['id']}", headers=_teacher(client)).status_code == 204


def test_changes_are_logged_and_feed_is_two_weeks(client, admin_user):
    headers = _admin(client)
    r = client.post("/sections", json={"name": "Z-test"}, headers=headers)
    assert r.status_code in (201, 422), r.text
    client.post("/users", json={"name": "New Teacher", "email": "nt@classsight.example",
                                "password": "longpassword1", "role": "teacher"}, headers=headers)
    kinds = [e["kind"] for e in client.get("/activity", headers=headers).json()]
    assert "teacher_added" in kinds
    assert client.get("/activity?days=30", headers=headers).status_code == 422
