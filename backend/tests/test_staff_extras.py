"""Teacher designation, typed weekly slots, creating a teacher with classes, subject rename and
subjects allotted to several degree programmes."""
from app.models import Classroom, Lecture, User
from tests.conftest import auth_headers, make_classroom

ADMIN = ("admin@classsight.example", "adminpass123")
TEACHER = ("teacher1@classsight.example", "teacherpass123")


def _teacher_payload(**extra):
    return {"name": "New Teacher", "email": "new@x.edu", "password": "longenough1", "role": "teacher", **extra}


def _slot(classroom_id, weekday=0, start="09:00", end="09:50", session_type="lecture", room="LT-1"):
    return {
        "classroom_id": classroom_id, "weekday": weekday, "start_time": start, "end_time": end,
        "session_type": session_type, "room": room,
    }


# ---- designation ----------------------------------------------------------------------------------


def test_designations_list_has_the_thirteen_ranks(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    ranks = client.get("/designations", headers=headers).json()
    assert len(ranks) == 13
    assert ranks[0] == "Professor" and "Assistant Professor (C-II) (Research)" in ranks


def test_teacher_designation_is_validated_stored_and_editable(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    bad = client.post("/users", json=_teacher_payload(designation="Dean"), headers=headers)
    assert bad.status_code == 422

    made = client.post("/users", json=_teacher_payload(designation="associate professor-i"), headers=headers)
    assert made.status_code == 201, made.text
    body = made.json()
    assert body["designation"] == "Associate Professor-I"  # canonical spelling

    changed = client.patch(f"/users/{body['id']}", json={"designation": "Professor"}, headers=headers)
    assert changed.status_code == 200 and changed.json()["designation"] == "Professor"
    assert client.get(f"/users/{body['id']}", headers=headers).json()["designation"] == "Professor"
    # an empty body changes nothing, so it is refused; department alone still works
    assert client.patch(f"/users/{body['id']}", json={}, headers=headers).status_code == 422
    assert client.patch(f"/users/{body['id']}", json={"department": ""}, headers=headers).status_code == 200
    assert client.get(f"/users/{body['id']}", headers=headers).json()["designation"] == "Professor"


def test_only_teachers_have_a_designation(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    made = client.post(
        "/users", json={**_teacher_payload(), "role": "admin", "designation": "Professor"}, headers=headers
    )
    assert made.status_code == 422
    assert client.patch(f"/users/{admin_user.id}", json={"designation": "Professor"}, headers=headers).status_code == 409


# ---- typed slots -----------------------------------------------------------------------------------


def test_slots_have_a_kind_and_same_kind_twice_a_day_needs_another_start(client, teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    url = f"/classrooms/{classroom.id}/lectures"
    lecture = client.post(url, json={"weekday": 1, "start_time": "09:00", "end_time": "09:50"}, headers=headers)
    assert lecture.status_code == 201 and lecture.json()["session_type"] == "lecture"  # the default

    lab = client.post(
        url, json={"weekday": 1, "start_time": "10:00", "end_time": "11:40", "session_type": "lab"}, headers=headers
    )
    assert lab.status_code == 201 and lab.json()["session_type"] == "lab"

    same_start = client.post(
        url, json={"weekday": 1, "start_time": "10:00", "end_time": "11:40", "session_type": "lab"}, headers=headers
    )
    assert same_start.status_code == 409
    second_lab = client.post(
        url, json={"weekday": 1, "start_time": "13:00", "end_time": "14:40", "session_type": "lab"}, headers=headers
    )
    assert second_lab.status_code == 201
    assert client.post(
        url, json={"weekday": 1, "start_time": "13:00", "end_time": "13:50", "session_type": "exam"}, headers=headers
    ).status_code == 422
    assert [x["session_type"] for x in client.get(url, headers=headers).json()] == ["lecture", "lab", "lab"]
    assert {x["session_type"] for x in client.get("/lectures?weekday=1", headers=headers).json()} == {"lecture", "lab"}


def test_a_slot_can_be_edited(client, teacher_user, other_teacher_user, classroom):
    headers = auth_headers(client, *TEACHER)
    url = f"/classrooms/{classroom.id}/lectures"
    first = client.post(url, json={"weekday": 0, "start_time": "09:00", "end_time": "09:50"}, headers=headers).json()
    client.post(url, json={"weekday": 2, "start_time": "09:00", "end_time": "09:50"}, headers=headers)

    edited = client.patch(
        f"{url}/{first['id']}",
        json={"weekday": 3, "end_time": "10:40", "room": " LT-7 ", "session_type": "tutorial"},
        headers=headers,
    )
    assert edited.status_code == 200, edited.text
    body = edited.json()
    assert (body["weekday"], body["end_time"], body["room"], body["session_type"]) == (3, "10:40:00", "LT-7", "tutorial")
    assert body["start_time"] == "09:00:00"  # untouched

    assert client.patch(f"{url}/{first['id']}", json={"end_time": "08:00"}, headers=headers).status_code == 422
    assert client.patch(f"{url}/{first['id']}", json={"room": None}, headers=headers).status_code == 422
    # moving onto the other slot's day and kind is a clash
    clash = client.patch(f"{url}/{first['id']}", json={"weekday": 2, "session_type": "lecture"}, headers=headers)
    assert clash.status_code == 409
    assert client.patch(f"{url}/9999", json={"room": "x"}, headers=headers).status_code == 404

    other = auth_headers(client, "teacher2@classsight.example", "teacherpass123")
    assert client.patch(f"{url}/{first['id']}", json={"room": "x"}, headers=other).status_code in (403, 404)


# ---- a new teacher with classes --------------------------------------------------------------------


def test_new_teacher_is_created_with_their_classes_and_slots_in_one_call(client, admin_user, db_session):
    headers = auth_headers(client, *ADMIN)
    a = make_classroom(db_session, "Maths", "3C2", None)
    b = make_classroom(db_session, "Physics", "3C2", None)
    made = client.post(
        "/users",
        json=_teacher_payload(
            schedule=[_slot(a.id, 0), _slot(a.id, 2), _slot(b.id, 1, session_type="lab", start="14:00", end="15:40")]
        ),
        headers=headers,
    )
    assert made.status_code == 201, made.text
    tid = made.json()["id"]
    db_session.expire_all()
    assert {c.teacher_id for c in db_session.query(Classroom).all()} == {tid}
    slots = db_session.query(Lecture).order_by(Lecture.classroom_id, Lecture.weekday).all()
    assert [(s.classroom_id, s.weekday, s.session_type, s.room) for s in slots] == [
        (a.id, 0, "lecture", "LT-1"), (a.id, 2, "lecture", "LT-1"), (b.id, 1, "lab", "LT-1")
    ]


def test_new_teacher_with_a_bad_class_creates_nothing(client, admin_user, db_session):
    headers = auth_headers(client, *ADMIN)
    room = make_classroom(db_session, "Maths", "3C2", None)

    missing = client.post("/users", json=_teacher_payload(schedule=[_slot(9999)]), headers=headers)
    assert missing.status_code == 422

    clash = client.post("/users", json=_teacher_payload(schedule=[_slot(room.id, 0), _slot(room.id, 0)]), headers=headers)
    assert clash.status_code == 409

    as_admin = client.post("/users", json={**_teacher_payload(schedule=[_slot(room.id)]), "role": "admin"}, headers=headers)
    assert as_admin.status_code == 422

    db_session.expire_all()
    assert db_session.query(User).filter(User.email == "new@x.edu").first() is None
    assert db_session.get(Classroom, room.id).teacher_id is None
    assert db_session.query(Lecture).count() == 0


# ---- renaming a subject ----------------------------------------------------------------------------


def test_subject_can_be_renamed_and_its_code_changed(client, admin_user, teacher_user, db_session):
    headers = auth_headers(client, *ADMIN)
    a = make_classroom(db_session, "Maths", "3C2", teacher_user.id, course_code="UMA1")
    make_classroom(db_session, "Physics", "3C2", teacher_user.id)

    done = client.patch(f"/classrooms/{a.id}", json={"course": "  Mathematics ", "course_code": " UMA101 "}, headers=headers)
    assert done.status_code == 200, done.text
    assert done.json()["course"] == "Mathematics" and done.json()["course_code"] == "UMA101"

    assert client.patch(f"/classrooms/{a.id}", json={"course": "physics"}, headers=headers).status_code == 409  # same batch
    assert client.patch(f"/classrooms/{a.id}", json={"course": ""}, headers=headers).status_code == 422
    assert client.patch(f"/classrooms/{a.id}", json={"course_code": "x" * 21}, headers=headers).status_code == 422
    assert client.patch(f"/classrooms/{a.id}", json={"course": "Maths"}, headers=headers).status_code == 200


def test_renaming_a_subject_without_a_batch_cannot_collide_either(client, admin_user, db_session):
    headers = auth_headers(client, *ADMIN)
    first = client.post("/classrooms", json={"course": "Surveying", "section": ""}, headers=headers).json()
    second = client.post("/classrooms", json={"course": "Drawing", "section": ""}, headers=headers).json()
    assert client.patch(f"/classrooms/{second['id']}", json={"course": "surveying"}, headers=headers).status_code == 409
    assert client.patch(f"/classrooms/{first['id']}", json={"course": "Geology"}, headers=headers).status_code == 200


# ---- several degree programmes per subject ---------------------------------------------------------


def test_subject_can_be_allotted_to_several_programmes(client, admin_user, db_session):
    headers = auth_headers(client, *ADMIN)
    made = client.post(
        "/classrooms",
        json={
            "course": "Maths", "section": "",
            "programmes": [
                {"degree_programme": "be computer engineering (tiet ug)", "start_year": 2024},
                {"degree_programme": "MCA (TIET PG)", "start_year": 2025},
            ],
        },
        headers=headers,
    )
    assert made.status_code == 201, made.text
    body = made.json()
    assert body["degree_programme"] == "BE Computer Engineering (TIET UG)"  # the first one
    assert body["programmes"] == [
        {"degree_programme": "BE Computer Engineering (TIET UG)", "start_year": 2024},
        {"degree_programme": "MCA (TIET PG)", "start_year": 2025},
    ]
    assert client.get("/classrooms", headers=headers).json()[0]["programmes"] == body["programmes"]

    replaced = client.patch(
        f"/classrooms/{body['id']}",
        json={"programmes": [{"degree_programme": "BE CSE (TIET UG)"}]},
        headers=headers,
    )
    assert replaced.json()["programmes"] == [{"degree_programme": "BE CSE (TIET UG)", "start_year": None}]
    assert replaced.json()["degree_programme"] == "BE CSE (TIET UG)"

    cleared = client.patch(f"/classrooms/{body['id']}", json={"programmes": []}, headers=headers).json()
    assert cleared["programmes"] == [] and cleared["degree_programme"] == ""


def test_programmes_are_validated(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    base = {"course": "Maths", "section": ""}
    unknown = client.post("/classrooms", json={**base, "programmes": [{"degree_programme": "BA Poetry"}]}, headers=headers)
    assert unknown.status_code == 422
    twice = client.post(
        "/classrooms",
        json={**base, "programmes": [{"degree_programme": "MCA (TIET PG)"}, {"degree_programme": "mca (tiet pg)"}]},
        headers=headers,
    )
    assert twice.status_code == 422
    bad_year = client.post(
        "/classrooms", json={**base, "programmes": [{"degree_programme": "MCA (TIET PG)", "start_year": 1800}]}, headers=headers
    )
    assert bad_year.status_code == 422


def test_the_single_degree_programme_still_works_and_shows_in_the_list(client, admin_user):
    headers = auth_headers(client, *ADMIN)
    made = client.post(
        "/classrooms", json={"course": "Maths", "section": "", "degree_programme": "MCA (TIET PG)"}, headers=headers
    ).json()
    assert made["programmes"] == [{"degree_programme": "MCA (TIET PG)", "start_year": None}]
    moved = client.patch(f"/classrooms/{made['id']}", json={"degree_programme": "BE CSE (TIET UG)"}, headers=headers).json()
    assert moved["programmes"] == [{"degree_programme": "BE CSE (TIET UG)", "start_year": None}]
    assert client.delete(f"/classrooms/{made['id']}", headers=headers).status_code == 204
