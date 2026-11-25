from app.models import Student
from tests.conftest import auth_headers, make_classroom

TEACHER = ("teacher1@classsight.example", "teacherpass123")
OTHER = ("teacher2@classsight.example", "teacherpass123")
ADMIN = ("admin@classsight.example", "adminpass123")


def _nfc_url(student):
    return f"/sections/{student.section_id}/students/{student.id}/nfc"


def test_admin_links_a_card_and_the_number_is_normalised(client, admin_user, student):
    headers = auth_headers(client, *ADMIN)
    linked = client.put(_nfc_url(student), json={"uid": "04:a2:3b:1c:5d:80"}, headers=headers)
    assert linked.status_code == 200, linked.text
    assert linked.json()["nfc_uid"] == "04A23B1C5D80"
    profile = client.get(f"/sections/{student.section_id}/students/{student.id}", headers=headers).json()
    assert profile["nfc_uid"] == "04A23B1C5D80" and profile["nfc_linked"] is True

    assert client.delete(_nfc_url(student), headers=headers).status_code == 204
    profile = client.get(f"/sections/{student.section_id}/students/{student.id}", headers=headers).json()
    assert profile["nfc_uid"] is None and profile["nfc_linked"] is False


def test_bad_card_numbers_are_rejected(client, admin_user, student):
    headers = auth_headers(client, *ADMIN)
    for bad in ["xyz", "04:A2", "04A23B1C5", ""]:
        assert client.put(_nfc_url(student), json={"uid": bad}, headers=headers).status_code == 422


def test_one_card_cannot_belong_to_two_students(client, admin_user, student, db_session):
    other = Student(roll_number="R-2", name="Second Student", section_id=student.section_id)
    db_session.add(other)
    db_session.commit()
    headers = auth_headers(client, *ADMIN)
    client.put(_nfc_url(student), json={"uid": "04A23B1C"}, headers=headers)
    clash = client.put(_nfc_url(other), json={"uid": "04 a2 3b 1c"}, headers=headers)
    assert clash.status_code == 409
    assert student.name in clash.json()["detail"]


def test_teacher_cannot_link_cards(client, teacher_user, student):
    headers = auth_headers(client, *TEACHER)
    assert client.put(_nfc_url(student), json={"uid": "04A23B1C"}, headers=headers).status_code == 403


def test_tap_finds_the_student_of_the_class(client, admin_user, teacher_user, classroom, student):
    client.put(_nfc_url(student), json={"uid": "04A23B1C"}, headers=auth_headers(client, *ADMIN))
    headers = auth_headers(client, *TEACHER)
    tap = client.post(f"/attendance/nfc?classroom_id={classroom.id}", json={"uid": "04:a2:3b:1c"}, headers=headers)
    assert tap.status_code == 200, tap.text
    assert tap.json() == {"student_id": student.id, "roll_number": student.roll_number, "name": student.name}

    unknown = client.post(f"/attendance/nfc?classroom_id={classroom.id}", json={"uid": "FFFFFFFF"}, headers=headers)
    assert unknown.status_code == 404


def test_tap_rejects_a_student_of_another_class(
    client, admin_user, teacher_user, other_teacher_user, classroom, db_session
):
    elsewhere = make_classroom(db_session, "PHY1", "Z", teacher_user.id)
    outsider = Student(roll_number="R-9", name="Outsider", section_id=elsewhere.section_id)
    db_session.add(outsider)
    db_session.commit()
    client.put(_nfc_url(outsider), json={"uid": "0A0B0C0D"}, headers=auth_headers(client, *ADMIN))
    tap = client.post(
        f"/attendance/nfc?classroom_id={classroom.id}", json={"uid": "0A0B0C0D"}, headers=auth_headers(client, *TEACHER)
    )
    assert tap.status_code == 422

    # and another teacher can't use this class at all
    other = client.post(
        f"/attendance/nfc?classroom_id={classroom.id}", json={"uid": "0A0B0C0D"}, headers=auth_headers(client, *OTHER)
    )
    assert other.status_code == 403

