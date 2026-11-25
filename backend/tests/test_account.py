from tests.conftest import auth_headers

TEACHER = ("teacher1@classsight.example", "teacherpass123")


def test_login_is_recorded_and_listed(client, teacher_user):
    headers = auth_headers(client, *TEACHER)
    rows = client.get("/auth/logins", headers={**headers}).json()
    assert len(rows) == 1 and "created_at" in rows[0]


def test_change_password_signs_out_old_tokens(client, teacher_user):
    old = auth_headers(client, *TEACHER)
    bad = client.post("/auth/password", json={"current_password": "wrong", "new_password": "newpass12345"}, headers=old)
    assert bad.status_code == 400
    r = client.post("/auth/password", json={"current_password": TEACHER[1], "new_password": "newpass12345"}, headers=old)
    assert r.status_code == 200
    new = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/auth/me", headers=old).status_code == 401
    assert client.get("/auth/me", headers=new).status_code == 200
    assert client.post("/auth/login", json={"email": TEACHER[0], "password": "newpass12345"}).status_code == 200


def test_logout_others_keeps_this_device(client, teacher_user):
    a = auth_headers(client, *TEACHER)
    b = auth_headers(client, *TEACHER)
    r = client.post("/auth/logout-others", headers=a)
    fresh = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/auth/me", headers=b).status_code == 401
    assert client.get("/auth/me", headers=fresh).status_code == 200


def test_student_account_routes(client, db_session, student):
    from app.core.security import hash_password

    student.email = "stu@classsight.example"
    student.password_hash = hash_password("studentpass1")
    db_session.commit()
    h = auth_headers(client, "stu@classsight.example", "studentpass1")
    assert len(client.get("/student/logins", headers=h).json()) == 1
    r = client.post("/student/password", json={"current_password": "studentpass1", "new_password": "studentpass2"}, headers=h)
    assert r.status_code == 200
    assert client.get("/student/me", headers=h).status_code == 401
    # staff routes still reject student tokens
    assert client.get("/auth/logins", headers={"Authorization": f"Bearer {r.json()['access_token']}"}).status_code == 401
