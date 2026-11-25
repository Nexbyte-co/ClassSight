from tests.conftest import auth_headers


def _reset(client, headers, user_id, new="brandnewpass1", admin_pw="adminpass123"):
    return client.put(
        f"/users/{user_id}/password",
        json={"new_password": new, "admin_password": admin_pw},
        headers=headers,
    )


def test_admin_resets_teacher_password(client, admin_user, teacher_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert _reset(client, headers, teacher_user.id).status_code == 204
    old = client.post("/auth/login", json={"email": teacher_user.email, "password": "teacherpass123"})
    assert old.status_code == 401
    auth_headers(client, teacher_user.email, "brandnewpass1")


def test_reset_needs_correct_admin_password(client, admin_user, teacher_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    response = _reset(client, headers, teacher_user.id, admin_pw="wrongpass")
    assert response.status_code == 403
    auth_headers(client, teacher_user.email, "teacherpass123")


def test_teacher_cannot_reset_passwords(client, teacher_user, other_teacher_user):
    headers = auth_headers(client, teacher_user.email, "teacherpass123")
    response = _reset(client, headers, other_teacher_user.id, admin_pw="teacherpass123")
    assert response.status_code == 403


def test_reset_rejects_short_and_same_password(client, admin_user, teacher_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert _reset(client, headers, teacher_user.id, new="short").status_code == 422
    assert _reset(client, headers, teacher_user.id, new="teacherpass123").status_code == 422


def test_reset_unknown_user_is_404(client, admin_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert _reset(client, headers, 9999).status_code == 404


def test_admin_reads_one_user(client, admin_user, teacher_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    response = client.get(f"/users/{teacher_user.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == teacher_user.email


def test_admin_deletes_teacher_without_classes(client, admin_user, teacher_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert client.delete(f"/users/{teacher_user.id}", headers=headers).status_code == 204
    assert client.get(f"/users/{teacher_user.id}", headers=headers).status_code == 404
    login = client.post("/auth/login", json={"email": teacher_user.email, "password": "teacherpass123"})
    assert login.status_code == 401


def test_cannot_delete_teacher_who_still_has_classes(client, admin_user, teacher_user, classroom):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    response = client.delete(f"/users/{teacher_user.id}", headers=headers)
    assert response.status_code == 409
    assert "1 class" in response.json()["detail"]
    assert client.get(f"/users/{teacher_user.id}", headers=headers).status_code == 200


def test_delete_after_giving_class_to_another_teacher(
    client, admin_user, teacher_user, other_teacher_user, classroom
):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    moved = client.patch(f"/classrooms/{classroom.id}", json={"teacher_id": other_teacher_user.id}, headers=headers)
    assert moved.status_code == 200
    assert moved.json()["teacher_id"] == other_teacher_user.id
    assert client.delete(f"/users/{teacher_user.id}", headers=headers).status_code == 204


def test_cannot_delete_yourself_or_an_admin(client, admin_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert client.delete(f"/users/{admin_user.id}", headers=headers).status_code == 409


def test_delete_unknown_user_is_404(client, admin_user):
    headers = auth_headers(client, admin_user.email, "adminpass123")
    assert client.delete("/users/9999", headers=headers).status_code == 404


def test_teacher_cannot_delete_users(client, teacher_user, other_teacher_user):
    headers = auth_headers(client, teacher_user.email, "teacherpass123")
    assert client.delete(f"/users/{other_teacher_user.id}", headers=headers).status_code == 403


def test_teacher_department_is_validated_and_subjects_follow_it(client, admin_user, db_session):
    from app.models import Department
    from tests.conftest import auth_headers as _auth, make_classroom

    db_session.add(Department(name="Department of Civil Engineering"))
    db_session.commit()
    admin = _auth(client, "admin@classsight.example", "adminpass123")

    bad = client.post(
        "/users",
        json={"name": "T", "email": "t@x.edu", "password": "longenough1", "role": "teacher", "department": "Nope"},
        headers=admin,
    )
    assert bad.status_code == 422
    made = client.post(
        "/users",
        json={"name": "T", "email": "t@x.edu", "password": "longenough1", "role": "teacher",
              "department": "department of civil engineering"},
        headers=admin,
    ).json()
    assert made["department"] == "Department of Civil Engineering"

    # a subject created without a department takes its teacher's
    room = client.post(
        "/classrooms", json={"course": "Surveying", "section": "", "teacher_id": made["id"]}, headers=admin
    ).json()
    assert room["department"] == "Department of Civil Engineering"
    assert room["section"] == ""  # no batch yet

    db_session.add(Department(name="Department of Biotechnology"))
    db_session.commit()
    moved = client.patch(f"/users/{made['id']}", json={"department": "Department of Biotechnology"}, headers=admin)
    assert moved.json()["department"] == "Department of Biotechnology"
    assert client.get(f"/classrooms", headers=admin).json()[0]["department"] == "Department of Biotechnology"
    assert client.patch(f"/users/{admin_user.id}", json={"department": ""}, headers=admin).status_code == 409
