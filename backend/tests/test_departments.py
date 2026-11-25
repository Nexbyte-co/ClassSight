from app.models import Department
from tests.conftest import auth_headers

TEACHER = ("teacher1@classsight.example", "teacherpass123")
ADMIN = ("admin@classsight.example", "adminpass123")


def test_any_signed_in_user_lists_departments_in_order(client, admin_user, teacher_user, db_session):
    db_session.add_all([Department(name="Maths"), Department(name="Physics")])
    db_session.commit()
    response = client.get("/departments", headers=auth_headers(client, *TEACHER))
    assert response.status_code == 200
    assert [d["name"] for d in response.json()] == ["Maths", "Physics"]


def test_list_requires_login(client):
    assert client.get("/departments").status_code == 401


def test_admin_creates_department_and_duplicates_are_rejected_ignoring_case(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    created = client.post("/departments", json={"name": "  Department of Law "}, headers=headers)
    assert created.status_code == 201
    assert created.json()["name"] == "Department of Law"
    again = client.post("/departments", json={"name": "department of law"}, headers=headers)
    assert again.status_code == 409


def test_teacher_cannot_create_department(client, teacher_user):
    response = client.post(
        "/departments", json={"name": "X"}, headers=auth_headers(client, *TEACHER)
    )
    assert response.status_code == 403
