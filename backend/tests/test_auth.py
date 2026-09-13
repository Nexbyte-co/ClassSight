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
