"""End-to-end check of enrollment and verification over HTTP against a running stack.

    E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \\
      python scripts/e2e_verify.py --data-dir ~/classsight-data --label augment-off

The admin must already exist (python -m app.db.seed). The run creates two teachers, one
classroom and one student per enrollment folder, with roll numbers prefixed by a run tag so
they can't collide with real data. It never prints or stores photos.

Probes (every one goes through POST /classrooms/{id}/verify):
  held-out  enroll a student without photo P, then verify P            (should match)
  known     verify verify/known photos against the full enrollment      (should match)
  stranger  remove one student's face data, then verify that student's
            photos against everyone else                                (must NOT match)

Results land in <out-dir>/<timestamp>-<label>/ (calls.jsonl, probes.json, checks.json,
summary.json). That folder holds real roll numbers, so keep it out of git.
Exit status is 1 if any check failed, anything was wrongly matched or accepted, a request
errored, or no probe was scored. Dev DB rows made by a run are tagged `E2E<tag>-` (the API has
no delete for students, users or classrooms; stored face data is removed even if the run
crashes). Needs the `requests` package, which is not in requirements.txt.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

from e2e_common import Dataset, load_dataset

REQUEST_TIMEOUT = 300  # the first face request loads the model


class Run:
    def __init__(self, base_url: str, run_dir: Path):
        self.base_url = base_url.rstrip("/")
        self.run_dir = run_dir
        self.session = requests.Session()
        self.calls = (run_dir / "calls.jsonl").open("w")
        self.checks: list[dict] = []
        self.probes: list[dict] = []
        self.findings: list[str] = []  # photos the API refused; working as designed, but worth knowing
        self._photo_cache: dict[Path, bytes] = {}
        self.created: dict = {"token": None, "classroom": None, "students": []}

    def photo(self, path: Path) -> bytes:
        if path not in self._photo_cache:
            self._photo_cache[path] = path.read_bytes()
        return self._photo_cache[path]

    def call(self, method, path, token=None, *, json_body=None, files=None, note=""):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        started = time.monotonic()
        response = self.session.request(
            method,
            self.base_url + path,
            headers=headers,
            json=json_body,
            files=files,
            timeout=REQUEST_TIMEOUT,
        )
        try:
            body = response.json()
        except ValueError:
            body = None
        record = {
            "method": method,
            "path": path,
            "status": response.status_code,
            "seconds": round(time.monotonic() - started, 3),
            "note": note,
            # Never log credentials or presigned links.
            "response": None if path.endswith("/login") else _redact(body),
        }
        self.calls.write(json.dumps(record) + "\n")
        self.calls.flush()
        return response.status_code, body

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.checks.append({"name": name, "passed": bool(ok), "detail": detail})
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  ({detail})" if detail else ""))
        return bool(ok)


def _redact(body):
    if isinstance(body, dict) and "photos" in body:
        body = {**body, "photos": [{**p, "url": "<presigned>"} for p in body["photos"]]}
    return body


def upload(run: Run, paths: list[Path]):
    return [("files", (p.name, run.photo(p), "image/jpeg")) for p in paths]


def enroll(run, token, cid, sid, paths, note=""):
    return run.call(
        "POST", f"/classrooms/{cid}/students/{sid}/face", token, files=upload(run, paths), note=note
    )


def enroll_usable(run, token, cid, sid, paths, note=""):
    """Enroll, dropping any photo the API refuses ("Photo k: ...") and retrying.

    Returns (status, body, photos actually used). A refused photo is recorded as a finding.
    """
    paths = list(paths)
    while paths:
        status, body = enroll(run, token, cid, sid, paths, note)
        detail = body.get("detail") if isinstance(body, dict) else None
        refused = re.match(r"Photo (\d+): (.*)", detail) if status == 422 and isinstance(detail, str) else None
        if not refused:
            return status, body, paths
        dropped = paths.pop(int(refused.group(1)) - 1)
        run.findings.append(f"enrollment refused {dropped.parent.name}/{dropped.name}: {refused.group(2)}")
    return 422, {}, paths


def verify_probe(run, token, cid, tag, kind, expected_roll, photo: Path):
    """Verify one photo; expected_roll is None for a stranger. Classify the outcome."""
    status, body = run.call(
        "POST",
        f"/classrooms/{cid}/verify",
        token,
        files={"file": (photo.name, run.photo(photo), "image/jpeg")},
        note=f"{kind} {photo.name}",
    )
    got_roll = None
    if status == 200 and body["verified"]:
        got_roll = body["student"]["roll_number"].removeprefix(tag)
    if status == 422:
        outcome = "unusable_photo"
        run.findings.append(f"verify refused {photo.name}: {body.get('detail')}")
    elif status != 200:
        outcome = f"error:{status}"
    elif expected_roll is None:
        outcome = "false_accept" if body["verified"] else f"rejected:{body['reason']}"
    elif body["verified"]:
        outcome = "correct" if got_roll == expected_roll else "wrong_person"
    else:
        outcome = f"miss:{body['reason']}"
    probe = {
        "kind": kind,
        "expected": expected_roll,
        "photo": str(photo.name),
        "got": got_roll,
        "confidence": body.get("confidence") if status == 200 else None,
        "reason": body.get("reason") if status == 200 else None,
        "outcome": outcome,
    }
    run.probes.append(probe)
    return probe


def run_experiments(run: Run, ds: Dataset, admin_email: str, admin_password: str, tag: str):
    print("== setup")
    status, body = run.call("GET", "/health")
    run.check("backend healthy", status == 200 and body.get("status") == "healthy")
    status, body = run.call(
        "POST", "/auth/login", json_body={"email": admin_email, "password": admin_password}
    )
    if not run.check("admin login", status == 200):
        sys.exit("Cannot log in as admin; seed it first (python -m app.db.seed).")
    admin = body["access_token"]

    teachers = {}
    for letter in ("a", "b"):
        password = secrets.token_urlsafe(16)
        email = f"e2e-teacher-{letter}-{tag.lower()}@example.com"
        status, user = run.call(
            "POST",
            "/users",
            admin,
            json_body={
                "name": f"E2E Teacher {letter.upper()}",
                "email": email,
                "password": password,
                "role": "teacher",
            },
        )
        run.check(f"create teacher {letter.upper()}", status == 201)
        status, body = run.call(
            "POST", "/auth/login", json_body={"email": email, "password": password}
        )
        teachers[letter] = {"id": user["id"], "token": body["access_token"]}
    ta, tb = teachers["a"]["token"], teachers["b"]["token"]

    status, classroom = run.call(
        "POST",
        "/classrooms",
        ta,
        json_body={"course": f"E2E {tag}", "section": "A", "teacher_id": teachers["a"]["id"]},
    )
    run.check("teacher A creates classroom", status == 201)
    cid = classroom["id"]
    run.created.update(token=ta, classroom=cid)

    sid_of: dict[str, int] = {}
    for roll in ds.rolls:
        status, student = run.call(
            "POST",
            f"/classrooms/{cid}/students",
            ta,
            json_body={"roll_number": tag + roll, "name": ds.names[roll]},
        )
        if not run.check(f"create student {roll}", status == 201):
            sys.exit("Cannot create students.")
        sid_of[roll] = student["id"]
        run.created["students"].append(student["id"])
    any_probe = next(iter(ds.enroll.values()))[0]

    print("== access control and empty classroom")
    status, _ = run.call("GET", f"/classrooms/{cid}/students", tb)
    run.check("teacher B cannot list A's students", status == 403, f"status {status}")
    some_roll = ds.rolls[0]
    status, _ = enroll(run, tb, cid, sid_of[some_roll], ds.enroll[some_roll][:1])
    run.check("teacher B cannot enroll into A's classroom", status == 403, f"status {status}")
    status, _ = run.call(
        "POST",
        f"/classrooms/{cid}/verify",
        tb,
        files={"file": (any_probe.name, run.photo(any_probe), "image/jpeg")},
    )
    run.check("teacher B cannot verify in A's classroom", status == 403, f"status {status}")
    status, body = run.call(
        "POST",
        f"/classrooms/{cid}/verify",
        ta,
        files={"file": (any_probe.name, run.photo(any_probe), "image/jpeg")},
    )
    run.check(
        "verify with nobody enrolled",
        status == 200 and body["reason"] == "no_enrolled_students" and not body["verified"],
    )

    print("== enroll everyone with all photos")
    usable: dict[str, list[Path]] = {}  # photos the API accepted; later steps use only these
    for roll in ds.rolls:
        status, body, usable[roll] = enroll_usable(run, ta, cid, sid_of[roll], ds.enroll[roll])
        run.check(
            f"enroll {roll}",
            status == 200 and body.get("photos_used") == len(usable[roll]),
            f"{len(usable[roll])} of {len(ds.enroll[roll])} photos accepted, status {status}",
        )
    status, roster = run.call("GET", f"/classrooms/{cid}/students", ta)
    run.check(
        "roster shows everyone as enrolled",
        status == 200 and all(s["face_enrolled"] for s in roster) and len(roster) == len(ds.rolls),
    )
    roll = ds.rolls[0]
    status, profile = run.call("GET", f"/classrooms/{cid}/students/{sid_of[roll]}", ta)
    run.check(
        "profile lists the stored photos",
        status == 200 and len(profile["photos"]) == len(usable[roll]),
    )
    if status == 200 and profile["photos"]:
        fetched = requests.get(profile["photos"][0]["url"], timeout=60)
        run.check("profile photo link opens", fetched.status_code == 200, f"{fetched.status_code}")

    print("== known: verify photos against the full enrollment")
    for roll, photos in ds.known.items():
        for photo in photos:
            probe = verify_probe(run, ta, cid, tag, "known", roll, photo)
            print(f"  {roll} {photo.name}: {probe['outcome']} ({probe['confidence']})")

    print("== held-out: enroll without photo P, then verify P")
    for roll, photos in usable.items():
        if len(photos) < 2:
            print(f"  skip {roll}: needs 2+ photos")
            continue
        for held_out in photos:
            rest = [p for p in photos if p != held_out]
            status, _ = enroll(run, ta, cid, sid_of[roll], rest, note=f"without {held_out.name}")
            if status != 200:
                run.check(f"re-enroll {roll} without {held_out.name}", False, f"status {status}")
                continue
            probe = verify_probe(run, ta, cid, tag, "held-out", roll, held_out)
            print(f"  {roll} minus {held_out.name}: {probe['outcome']} ({probe['confidence']})")
        status, _ = enroll(run, ta, cid, sid_of[roll], photos, note="restore full enrollment")
        run.check(f"restore full enrollment {roll}", status == 200)

    print("== stranger: remove one student, verify their photos against everyone else")
    for roll in ds.rolls:
        status, _ = run.call("DELETE", f"/classrooms/{cid}/students/{sid_of[roll]}/face", ta)
        if not run.check(f"remove face data {roll}", status == 204, f"status {status}"):
            continue
        for photo in usable[roll] + ds.known.get(roll, []):
            probe = verify_probe(run, ta, cid, tag, "stranger", None, photo)
            print(f"  {roll} {photo.name}: {probe['outcome']} ({probe['confidence']})")
        status, _ = enroll(run, ta, cid, sid_of[roll], usable[roll], note="restore")
        run.check(f"restore enrollment {roll}", status == 200)
    for photo in ds.unknown:
        probe = verify_probe(run, ta, cid, tag, "stranger", None, photo)
        print(f"  unknown {photo.name}: {probe['outcome']} ({probe['confidence']})")

    print("== delete removes the stored photos")
    roll = ds.rolls[-1]
    status, profile = run.call("GET", f"/classrooms/{cid}/students/{sid_of[roll]}", ta)
    link = profile["photos"][0]["url"]
    before = requests.get(link, timeout=60)
    run.check("photo link opens before delete", before.status_code == 200, f"{before.status_code}")
    status, _ = run.call("DELETE", f"/classrooms/{cid}/students/{sid_of[roll]}/face", ta)
    run.check("delete face data", status == 204)
    status, profile = run.call("GET", f"/classrooms/{cid}/students/{sid_of[roll]}", ta)
    run.check(
        "profile empty after delete", status == 200 and not profile["photos"] and not profile["face_enrolled"]
    )
    gone = requests.get(link, timeout=60)
    # 404 for a missing key; real S3 answers 403 when the role may not list the bucket.
    run.check("old photo link no longer opens", gone.status_code in (403, 404), f"{gone.status_code}")


def remove_face_data(run: Run):
    """Delete stored photos for every student this run created, even after a crash."""
    made = run.created
    if not made["token"] or made["classroom"] is None:
        return
    print("== cleanup: remove face data (S3 objects)")
    for sid in made["students"]:
        try:
            run.call(
                "DELETE", f"/classrooms/{made['classroom']}/students/{sid}/face", made["token"],
                note="cleanup",
            )
        except requests.RequestException as exc:
            print(f"  could not remove face data for student id {sid}: {exc}")


def summarize(run: Run, args) -> dict:
    def tally(kind):
        rows = [p for p in run.probes if p["kind"] == kind]
        outcomes: dict[str, int] = {}
        for row in rows:
            outcomes[row["outcome"]] = outcomes.get(row["outcome"], 0) + 1
        scores = [r["confidence"] for r in rows if r["confidence"] is not None]
        return {
            "n": len(rows),
            "outcomes": outcomes,
            "confidence_min": min(scores, default=None),
            "confidence_max": max(scores, default=None),
        }

    summary = {
        "label": args.label,
        "base_url": args.base_url,
        "known": tally("known"),
        "held-out": tally("held-out"),
        "stranger": tally("stranger"),
        "checks_passed": sum(c["passed"] for c in run.checks),
        "checks_failed": sum(not c["passed"] for c in run.checks),
        "refused_by_api": sorted(set(run.findings)),
    }
    # Photos the API refused (e.g. a second face in frame) were never scored, so they don't count.
    scored = [p for p in run.probes if p["outcome"] != "unusable_photo"]
    genuine = [p for p in scored if p["kind"] != "stranger"]
    strangers = [p for p in scored if p["kind"] == "stranger"]
    summary["genuine_correct"] = sum(p["outcome"] == "correct" for p in genuine)
    summary["genuine_total"] = len(genuine)
    summary["wrong_person"] = sum(p["outcome"] == "wrong_person" for p in genuine)
    summary["false_accepts"] = sum(p["outcome"] == "false_accept" for p in strangers)
    summary["stranger_total"] = len(strangers)
    summary["unusable_photos"] = len(run.probes) - len(scored)
    summary["request_errors"] = sum(p["outcome"].startswith("error:") for p in run.probes)

    failures = []
    if summary["checks_failed"]:
        failures.append(f"{summary['checks_failed']} check(s) failed")
    if summary["false_accepts"]:
        failures.append(f"{summary['false_accepts']} stranger(s) accepted")
    if summary["wrong_person"]:
        failures.append(f"{summary['wrong_person']} photo(s) matched to the wrong student")
    if summary["request_errors"]:
        failures.append(f"{summary['request_errors']} verify request(s) errored")
    if not genuine or not strangers:
        failures.append("no genuine or no stranger probe was scored")
    summary["failures"] = failures
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--data-dir", default="~/classsight-data")
    parser.add_argument("--label", default="run", help="e.g. augment-off")
    parser.add_argument("--out-dir", default=str(Path(__file__).resolve().parents[2] / "e2e-results"))
    args = parser.parse_args()

    admin_email = os.environ.get("E2E_ADMIN_EMAIL")
    admin_password = os.environ.get("E2E_ADMIN_PASSWORD")
    if not admin_email or not admin_password:
        sys.exit("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.")

    ds = load_dataset(Path(args.data_dir).expanduser())
    run_dir = Path(args.out_dir) / f"{datetime.now():%Y%m%d-%H%M%S}-{args.label}"
    run_dir.mkdir(parents=True)
    tag = f"E2E{datetime.now():%d%H%M%S}-"
    print(f"{len(ds.rolls)} students, {sum(map(len, ds.enroll.values()))} enrollment photos -> {run_dir}")

    run = Run(args.base_url, run_dir)
    try:
        run_experiments(run, ds, admin_email, admin_password, tag)
    finally:
        remove_face_data(run)
        run.calls.close()
        (run_dir / "probes.json").write_text(json.dumps(run.probes, indent=2))
        (run_dir / "checks.json").write_text(json.dumps(run.checks, indent=2))
        (run_dir / "findings.json").write_text(json.dumps(run.findings, indent=2))
    summary = summarize(run, args)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    print("\n== summary")
    print(json.dumps(summary, indent=2))
    return 1 if summary["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
