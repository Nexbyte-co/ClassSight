import pytest

from app.models import Classroom, Department, Lecture
from tests.conftest import auth_headers, make_classroom

TEACHER = ("teacher1@classsight.example", "teacherpass123")
OTHER = ("teacher2@classsight.example", "teacherpass123")
ADMIN = ("admin@classsight.example", "adminpass123")


def _slot(weekday=0, start="09:40", end="11:20", room="L105"):
    return {"weekday": weekday, "start_time": start, "end_time": end, "room": room}


def _url(classroom):
    return f"/classrooms/{classroom.id}/lectures"


def test_owner_creates_and_lists_lectures(client, teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    created = client.post(_url(classroom), json=_slot(), headers=headers)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["weekday"] == 0 and body["room"] == "L105"
    assert body["start_time"] == "09:40:00" and body["end_time"] == "11:20:00"

    client.post(_url(classroom), json=_slot(weekday=2, start="08:00", end="08:50"), headers=headers)
    listing = client.get(_url(classroom), headers=headers).json()
    assert [item["weekday"] for item in listing] == [0, 2]


def test_same_kind_twice_on_a_weekday_needs_different_start_times(client, teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    assert client.post(_url(classroom), json=_slot(), headers=headers).status_code == 201
    assert client.post(_url(classroom), json=_slot(start="13:00", end="14:00"), headers=headers).status_code == 201
    same_start = client.post(_url(classroom), json=_slot(end="10:30"), headers=headers)
    assert same_start.status_code == 409
    assert "weekday" in same_start.json()["detail"]

@pytest.mark.parametrize(
    "payload",
    [
        {**_slot(), "end_time": "09:40"},  # ends when it starts
        {**_slot(), "end_time": "09:00"},  # ends before it starts
        {**_slot(), "weekday": 7},
        {**_slot(), "weekday": -1},
        {**_slot(), "start_time": "not a time"},
        {**_slot(), "room": "x" * 41},
        {**_slot(), "start_time": "09:40+05:30"},  # timezone offsets are rejected, not a 500
        {**_slot(), "start_time": "09:40", "end_time": "11:00Z"},
    ],
)
def test_invalid_lecture_rejected(client, teacher_user, classroom, payload):
    headers = auth_headers(client, *TEACHER)
    assert client.post(_url(classroom), json=payload, headers=headers).status_code == 422


def test_other_teacher_cannot_touch_the_lectures(client, teacher_user, other_teacher_user, classroom):
    mine = auth_headers(client, *TEACHER)
    lecture_id = client.post(_url(classroom), json=_slot(), headers=mine).json()["id"]
    theirs = auth_headers(client, *OTHER)
    assert client.get(_url(classroom), headers=theirs).status_code == 403
    assert client.post(_url(classroom), json=_slot(weekday=3), headers=theirs).status_code == 403
    assert client.delete(f"{_url(classroom)}/{lecture_id}", headers=theirs).status_code == 403


def test_admin_can_manage_any_class(client, admin_user, classroom):
    headers = auth_headers(client, *ADMIN)
    created = client.post(_url(classroom), json=_slot(), headers=headers)
    assert created.status_code == 201
    assert client.delete(f"{_url(classroom)}/{created.json()['id']}", headers=headers).status_code == 204


def test_delete_lecture_and_unknown_id(client, teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    lecture_id = client.post(_url(classroom), json=_slot(), headers=headers).json()["id"]
    assert client.delete(f"{_url(classroom)}/{lecture_id}", headers=headers).status_code == 204
    assert client.get(_url(classroom), headers=headers).json() == []
    assert client.delete(f"{_url(classroom)}/{lecture_id}", headers=headers).status_code == 404


def test_lecture_of_another_class_is_not_deletable_through_this_one(
    client, db_session, teacher_user, classroom
):
    second = make_classroom(db_session, "CS202", "B", teacher_user.id)
    headers = auth_headers(client, *TEACHER)
    other_id = client.post(_url(second), json=_slot(), headers=headers).json()["id"]
    assert client.delete(f"{_url(classroom)}/{other_id}", headers=headers).status_code == 404
    assert db_session.get(Lecture, other_id) is not None


def test_schedule_lists_only_own_classes_in_time_order(
    client, db_session, teacher_user, other_teacher_user, classroom
):
    classroom.course_code = "UCS503P"
    classroom.department = "CSE"
    foreign = make_classroom(db_session, "PHY1", "Z", other_teacher_user.id)
    mine = auth_headers(client, *TEACHER)
    theirs = auth_headers(client, *OTHER)
    client.post(_url(classroom), json=_slot(weekday=0, start="13:50", end="15:30"), headers=mine)
    client.post(_url(foreign), json=_slot(weekday=0), headers=theirs)

    own = client.get("/lectures", headers=mine).json()
    assert len(own) == 1
    assert own[0]["course"] == "CS101" and own[0]["section"] == "A"
    assert own[0]["course_code"] == "UCS503P" and own[0]["department"] == "CSE"
    assert own[0]["classroom_id"] == classroom.id


def test_schedule_weekday_filter_and_order(client, teacher_user, classroom, db_session):
    second = make_classroom(db_session, "CS202", "B", teacher_user.id)
    headers = auth_headers(client, *TEACHER)
    client.post(_url(classroom), json=_slot(weekday=0, start="13:50", end="15:30"), headers=headers)
    client.post(_url(second), json=_slot(weekday=0, start="09:40", end="11:20"), headers=headers)
    client.post(_url(second), json=_slot(weekday=4, start="09:40", end="11:20"), headers=headers)

    monday = client.get("/lectures", params={"weekday": 0}, headers=headers).json()
    assert [item["start_time"] for item in monday] == ["09:40:00", "13:50:00"]
    assert len(client.get("/lectures", headers=headers).json()) == 3
    assert client.get("/lectures", params={"weekday": 7}, headers=headers).status_code == 422


def test_admin_sees_every_lecture(client, admin_user, teacher_user, other_teacher_user, classroom, db_session):
    foreign = make_classroom(db_session, "PHY1", "Z", other_teacher_user.id)
    headers = auth_headers(client, *ADMIN)
    client.post(_url(classroom), json=_slot(weekday=1), headers=headers)
    client.post(_url(foreign), json=_slot(weekday=1, start="10:00", end="10:50"), headers=headers)
    assert len(client.get("/lectures", headers=headers).json()) == 2


def test_schedule_requires_login(client):
    assert client.get("/lectures").status_code == 401


def test_classroom_create_stores_course_code_and_department(
    client, admin_user, teacher_user, db_session
):
    db_session.add(Department(name="Department of Computer Science & Engineering"))
    db_session.commit()
    headers = auth_headers(client, *ADMIN)
    response = client.post(
        "/classrooms",
        json={
            "course": "Software Engineering",
            "section": "3C2C",
            "teacher_id": teacher_user.id,
            "course_code": " UCS503P ",
            "department": "Department of Computer Science & Engineering",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["course_code"] == "UCS503P"
    assert body["department"] == "Department of Computer Science & Engineering"


def test_classroom_without_details_defaults_to_empty(client, admin_user, teacher_user):
    headers = auth_headers(client, *ADMIN)
    body = client.post(
        "/classrooms",
        json={"course": "Maths", "section": "A", "teacher_id": teacher_user.id},
        headers=headers,
    ).json()
    assert body["course_code"] == "" and body["department"] == ""


def _move(lecture_id, weekday, start, end):
    return {"lecture_id": lecture_id, "weekday": weekday, "start_time": start, "end_time": end}


def test_admin_moves_slots_at_once_and_can_swap(client, admin_user, teacher_user, classroom):
    headers = auth_headers(client, *ADMIN)
    a = client.post(_url(classroom), json=_slot(weekday=0, start="08:00", end="08:50"), headers=headers).json()
    b = client.post(_url(classroom), json=_slot(weekday=0, start="08:50", end="09:40"), headers=headers).json()
    lab = client.post(
        _url(classroom), json={**_slot(weekday=1, start="09:40", end="11:20"), "session_type": "lab"}, headers=headers
    ).json()
    moved = client.patch(
        "/lectures",
        json={"moves": [
            _move(a["id"], 0, "08:50", "09:40"),
            _move(b["id"], 0, "08:00", "08:50"),
            _move(lab["id"], 3, "13:50", "15:30"),
        ]},
        headers=headers,
    )
    assert moved.status_code == 200, moved.text
    by_id = {item["id"]: item for item in client.get(_url(classroom), headers=headers).json()}
    assert by_id[a["id"]]["start_time"] == "08:50:00" and by_id[b["id"]]["start_time"] == "08:00:00"
    assert by_id[lab["id"]]["weekday"] == 3 and by_id[lab["id"]]["end_time"] == "15:30:00"
    assert by_id[lab["id"]]["session_type"] == "lab" and by_id[lab["id"]]["room"] == "L105"


def test_move_rejects_a_clash_with_the_teachers_other_class(client, admin_user, teacher_user, classroom, db_session):
    other = make_classroom(db_session, "MA101", "B", teacher_user.id)
    headers = auth_headers(client, *ADMIN)
    mine = client.post(_url(classroom), json=_slot(weekday=0, start="08:00", end="08:50"), headers=headers).json()
    client.post(_url(other), json=_slot(weekday=2, start="09:40", end="11:20"), headers=headers)
    clash = client.patch("/lectures", json={"moves": [_move(mine["id"], 2, "10:30", "11:20")]}, headers=headers)
    assert clash.status_code == 409
    assert "MA101" in clash.json()["detail"]
    # nothing changed
    assert client.get(_url(classroom), headers=headers).json()[0]["weekday"] == 0


def test_only_admins_move_slots(client, teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    lec = client.post(_url(classroom), json=_slot(), headers=headers).json()
    res = client.patch("/lectures", json={"moves": [_move(lec["id"], 1, "08:00", "08:50")]}, headers=headers)
    assert res.status_code == 403
