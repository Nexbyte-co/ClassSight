from tests.conftest import auth_headers


def test_login_succeeds_with_correct_credentials(client, teacher_user):
    response = client.post(
        "/auth/login",
        json={"email": "teacher1@classsight.example", "password": "teacherpass123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_fails_with_wrong_password(client, teacher_user):
    response = client.post(
        "/auth/login",
        json={"email": "teacher1@classsight.example", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_fails_for_unknown_email(client):
    response = client.post(
        "/auth/login", json={"email": "nobody@classsight.example", "password": "whatever123"}
    )
    assert response.status_code == 401


def test_me_requires_bearer_token(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user(client, teacher_user):
    headers = auth_headers(client, "teacher1@classsight.example", "teacherpass123")
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "teacher1@classsight.example"


def _bad_login(client, email="teacher1@classsight.example"):
    return client.post("/auth/login", json={"email": email, "password": "wrong-password"})


def test_login_is_blocked_after_repeated_failures_for_one_email(client, teacher_user):
    for _ in range(5):
        assert _bad_login(client).status_code == 401

    # Even the right password is refused while the email is locked out.
    blocked = client.post(
        "/auth/login",
        json={"email": "teacher1@classsight.example", "password": "teacherpass123"},
    )
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0


def test_lockout_does_not_affect_other_emails(client, teacher_user, admin_user):
    for _ in range(5):
        _bad_login(client)
    assert _bad_login(client).status_code == 429

    other = client.post(
        "/auth/login",
        json={"email": admin_user.email, "password": "adminpass123"},
    )
    assert other.status_code == 200


def test_successful_login_clears_that_emails_failures(client, teacher_user):
    for _ in range(4):
        _bad_login(client)
    ok = client.post(
        "/auth/login",
        json={"email": "teacher1@classsight.example", "password": "teacherpass123"},
    )
    assert ok.status_code == 200
    for _ in range(4):
        assert _bad_login(client).status_code == 401


def test_login_is_blocked_after_many_failures_from_one_ip(client):
    for i in range(20):
        assert _bad_login(client, email=f"nobody{i}@classsight.example").status_code == 401
    assert _bad_login(client, email="someone-new@classsight.example").status_code == 429
