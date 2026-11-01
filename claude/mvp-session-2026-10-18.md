# MVP session: 2026-10-18 (updated 2026-11-01)

Picks up from `claude/face-recognition-session.md` (2026-10-11). This file is the
handoff for the next session: what was decided, what is done and verified, and
what remains. Read this first. **Sections marked 2026-10-23 are the latest;
Phases A, B and C are done; Phase D (AWS EC2) is deployed and partly verified (see "Phase D status 2026-11-01"); Phase E is next after it.**

## The MVP being built (requirements from the user)
1. Containerize the whole app and run it on AWS EC2.
2. Enroll students: upload photos, unique ID (college roll no.) + details, store info and photos.
3. Teacher account: a unique login, a list of enrolled students, and student profiles.
4. Verification: the teacher captures a student's photo, the system identifies them, and shows the result.
5. Initial testing of all of the above, including running on EC2.

## Decisions (do not re-ask)
- **Scope:** one classroom, one teacher (MVP).
- **Student ID:** `roll_number` = college roll no., **unique college-wide**.
- **Enrollment photos ARE stored** in a private S3 bucket (`students/{roll}/`); they're deletable via `DELETE …/face`. (This reverses the 2026-10-11 "never store" decision.)
- **Verification:** "identify within a class": one photo → which enrolled student, or not recognised.
- **No frontend code changes** until the backend flow is verified end to end. Frontend work = Phase E (document only).
- **Augmentation:** `ENROLL_AUGMENT` (mirror + ±40 brightness) **stays off**: Phase C showed no useful gain (scores moved 0.01–0.02, no result changed) and it costs ~4x detection work.
- **A wrong match is worse than a miss.** `MATCH_THRESHOLD` 0.5 / `AMBIGUITY_MARGIN` 0.05 **stay unchanged**: the 5-student data sits far from them (same person ≥ 0.70, strangers ≤ 0.29) but can't discriminate between 0.30 and 0.65, so there is no evidence to move them and not enough to tune. Re-tune with 15–20 students photographed on a different day.
- **Only 5 students' photos exist and no more can be added** (privacy). The demo is on those 5. There are no photos of unknown people; strangers are simulated by leaving one student out of the class.
- **Local S3 is SeaweedFS**, not MinIO: MinIO's free images are no longer published on any registry.
- **No fake data:** the seed script creates the first admin only.
- **AWS:** the user now has an account on the credit-based Free plan ($120 credits, 180 days); see "Phase D status 2026-11-01".

## Working agreements (user preferences)
- **Phase by phase:** finish one phase, verify it, report, and **wait for approval before committing or starting the next phase**.
- **No Claude attribution** in commits/PRs. Set in `~/.claude/settings.json` (`attribution` all empty). Old commit `3bbacc3` (already pushed) still has a Sonnet co-author line; rewriting it needs a force-push, which has **not** been approved.
- Explain changes file by file, with the reason for each.
- **Independent review:** before reporting a phase, run a separate **read-only** reviewer agent (no edits, no commits/pushes, no dev-DB or Docker changes) that checks the code and whether we're off plan. It reports; the main agent fixes. It found real bugs in Phase C (exit code, cleanup, error parsing).
- Commit and push only when the user says so. They have approved commits for Phase C (done).
- Ask before AWS actions (they cost money and are visible outside the machine).

## Branches and commits
| Branch | Commit | What |
|---|---|---|
| `feature/face-recognition-model` (pushed) | `cf0d02e` | Phase A + DB setup fixes |
| | `ff9ff27` | One matching path (`identify_face` removed) |
| `feature/containerization-ec2` (pushed, from the branch above) | `c87eb11` | Phase B containers |

**Update 2026-10-23:** PR #8 merged these into `develop`. The old branches `feature/containerization-ec2` and `feature/face-recognition-model` were deleted locally and on GitHub (recreate with `git branch <name> c87eb11` / `ff9ff27` if ever needed). Local `develop` was fast-forwarded to `origin/develop` (`825b774`). Work continues on **`feature/e2e-verification`** (from `develop`, pushed):

| Commit | What |
|---|---|
| `3ade9a3` | Phase C scripts (`backend/scripts/e2e_common.py`, `e2e_verify.py`, `e2e_scores.py`) + `.gitignore` entry `e2e-results/` |
| `425741a` | `docs/e2e-verification.md` + this handoff note |
| `1b2eb1e` | Journal entry `Journals/1024030331_Journal/Manit Sharma 2026-10-23.md` |

The journal entry is committed. The `Journals/` folder (with the readme and the 2026-10-11 entry) exists on `main` but not on `develop`, so on this branch the folder holds only the new entry; it merges cleanly because the file name is new. This note was updated again after the journal commit (see `git log`). No PR is open for this branch yet. Commits carry no Claude attribution.

**Update 2026-11-01:** PR #9 merged `feature/e2e-verification` into `develop` (`0ab884a`). Phase D work is on **`feature/aws-ec2-deploy`** (from `develop` at `0ab884a`, pushed, **no PR yet**; open it after the EC2 checks pass):

| Commit | What |
|---|---|
| `56ef803` | Caddy HTTPS in `docker-compose.ec2.yml`, `deploy.sh`, `backup.sh`, `docs/aws-deployment.md`, login throttle, `ENABLE_DOCS`, proxy headers; 65 tests pass |
| uncommitted | `docs/aws-deployment.md`: seed command uses `docker exec` (Session Manager hang note) |

## Done this session

### DB/dev setup fixes (in `cf0d02e`)
- The compose Postgres password was `classsight_password` while the app used `classsight` everywhere → compose aligned to `classsight`.
- `deployment/init-test-db.sql` creates `classsight_test` on a **fresh** volume. Older volumes need it created once: `docker exec classsight-postgres psql -U classsight -d classsight -c "CREATE DATABASE classsight_test"`.
- `app/db/session.py` now reads `get_settings()`. It used to ignore `.env` while Alembic read it.
- `app/db/seed.py`: `SEED_ADMIN_EMAIL=you@x python -m app.db.seed` (password from `SEED_ADMIN_PASSWORD` or printed once).

### Phase A: backend (in `cf0d02e`, `ff9ff27`)
- **Roll number + photos:** `roll_number` is unique college-wide (constraint `uq_students_roll_number`). New `StudentPhoto` model holds only S3 keys. Migration `b7d2e4f1a903` passes `alembic check` and down/up.
- **Enroll:** `POST /classrooms/{id}/students/{sid}/face` takes 1–5 one-face photos and checks all of them **before** uploading.
  - Then: upload to S3 → save the averaged embedding → delete old photos.
  - S3 failure → 503 and nothing saved.
- **Profile:** `GET /classrooms/{id}/students/{sid}` returns photo links that expire in 5 minutes.
- **Delete:** `DELETE …/face` removes from S3 first (so it's retryable), then the DB rows and embedding.
- **Verify:** `POST /classrooms/{id}/verify` takes one photo with exactly one face, or one dominant face (area ≥ 5x the next largest; else 422).
  - Returns `verified`, `student`, `confidence`, and `reason` ∈ `matched | below_threshold | ambiguous | no_enrolled_students`.
  - Captured photos are not stored.
- **`face_enrolled`** added to `StudentOut`.
- **`/process`** returns 422 (not 500) for an undecodable photo.
- **Matching:** `match_embeddings` returns a `FaceDecision` for **every** face. Group photos and `/verify` share one scoring path, and `_decide` is the single accept/reject rule.
  - Extra faces beyond the number of candidates are marked `unassigned`.
  - `matches` / `unrecognized_face_count` are computed properties.
- **Settings:** `S3_ENDPOINT_URL`, `S3_PUBLIC_ENDPOINT_URL`, `ENROLL_AUGMENT`, `LOG_LEVEL`. Empty endpoint = real AWS S3.
- **Logging:** counts, scores, S3 keys and decisions. Never images or embeddings.

### Phase B: containers (in `c87eb11`)
- **`backend/Dockerfile`:** two-stage build, non-root user, model weights in the `insightface_models` volume. Keeps only **headless** OpenCV, because insightface 2.1 pulls in the GUI build, which crashes in containers (`libxcb.so.1`).
- **`backend/docker-entrypoint.sh`:** `alembic upgrade head` → download/warm the model (`PRELOAD_MODEL`) → uvicorn.
- **`deployment/frontend.Dockerfile`** + `deployment/nginx/frontend.conf`: Vite build served by nginx, with SPA fallback. **No file under `frontend/` was changed.**
- **`deployment/docker-compose.yml`:**
  - Postgres only by default (dev/pytest workflow unchanged).
  - Profile `app` = backend:8000 + frontend:80.
  - Profile `local` = SeaweedFS `s3`:8333 + a `s3-init` job that creates the bucket.
- **`deployment/docker-compose.ec2.yml`:** real S3 via the instance IAM role (keys blank), Postgres bound to `127.0.0.1`, restart policies.
- **`deployment/.env.example`** and **`deployment/README.md`** (how to run locally and on EC2). The local `deployment/.env` exists and is git-ignored.

### Verified
- `pytest`: **61/61** in the venv and **61/61 inside the Linux container**.
- **Mutation check:** forcing `_decide` to always match fails 6 safety tests.
- **Real model on the InsightFace sample `t1.jpg`** (6 people, margin crops):
  - 6/6 identified from darker mirrored copies (conf 0.91–0.96).
  - A non-enrolled person was rejected (0.04).
  - A group photo was rejected for enrollment.
  - Not an accuracy measurement: the probes came from the same photo.
- **Full stack smoke through the containers: 16/16 passed.**
  - API/docs/frontend/SPA fallback, CORS, seeded admin → teacher.
  - Enroll → S3; profile link opens from the host; bucket refuses anonymous access (403).
  - Verify: 2 matched (0.936/0.940), 1 rejected (0.017).
  - Delete removes the S3 object.
  - Smoke data was deleted afterwards; the dev DB and bucket are empty.
- **Restart:** healthy in 7 s with no model re-download.

## Known issues and limits
- **Tightly cropped faces fail detection.** A 112×112 crop gives 0 faces, and ID-card crops will be rejected. Enrollment photos need head and shoulders with background. A possible fix: pad the image before detection. Check in Phase C.
- **The startup preload loads the model in a separate process.** The API process loads it again on the first face request, a few seconds with no download. Memory with the model loaded was **not measured** (the user stopped that command); the estimate is ~1–1.5 GB.
- **EC2 must expose port 8000 as well as 80.** The browser calls the API directly. Proxying `/api` via nginx would collide with the frontend's `/attendance` route and needs a frontend change.
- **No NFC in the backend:** no `nfc_uid` and no endpoint. The frontend NFC flow is a `setTimeout` simulation. The fallback works **per student** (roster minus matched → unverified list), not per face.
- **`attendance_records` doesn't store the verification method** (ai/nfc/manual). It's a small schema change, not yet planned.
- **The frontend does not call the API at all** (see "Frontend changed"). Real attendance history is only visible through `/docs` until Phase E.
- **Browser camera capture needs HTTPS** on EC2 (a domain + TLS). Not needed for backend testing.
- `HTTP_422_UNPROCESSABLE_ENTITY` deprecation warnings appear across the codebase; pre-existing and harmless.

## Done 2026-10-23 (Phase C: local end-to-end with real photos)
Steps, in order:
1. Pulled `develop`; found a teammate's frontend rewrite (below). Made `feature/e2e-verification`; cleaned up old branches.
2. Created `~/classsight-data/` (outside the repo): `students.csv` (header only, so placeholder names are used), `enroll/<roll>/` (5 students, 3–5 photos each = 20), `verify/known/` (4 photos, `<roll>_test.jpeg`), `verify/unknown/` (empty). Started Docker; 61/61 tests still pass.
3. Wrote `backend/scripts/`:
   - `e2e_verify.py`: HTTP harness over the running stack. Probes: **held-out** (enroll without photo P, verify P), **known** (separate test photo), **stranger** (remove the student's face data, verify their photos). Also: second teacher gets 403, empty class → `no_enrolled_students`, profile + photo link opens, delete removes photos (link 404). Exit code 1 on any failed check, wrong match, false accept, request error, or nothing scored. Removes stored face data even after a crash. Needs `requests` (not in requirements.txt).
   - `e2e_scores.py`: offline replay on the host (model weights in `~/.insightface`) through the app's own `match_embeddings`, with a threshold × margin sweep. Its scores match the API run to 3 decimals.
   - `e2e_common.py`: dataset loader.
4. Ran both passes (augmentation off, then on; confirmed via the "augmented copies used" log lines). Saved to git-ignored `e2e-results/` with backend logs.
5. Independent reviewer agent checked the code; fixed its findings.
6. Wrote `docs/e2e-verification.md` (students shown as S1–S5, no roll numbers), committed and pushed.
7. Cleaned up: dev DB (0 users/classrooms/students/photos) and the S3 bucket (0 objects). Test rows are tagged `E2E…` / `e2e-*@example.com`. No embeddings or images are in `e2e-results/`. Physical wipe of Postgres/SeaweedFS storage was **not** verified (`docker compose down -v` would do it; the user declined).

**Results (5 students):** 41/41 checks in both passes; 20/20 same-person probes identified; 0 wrong matches; 0/20 strangers accepted. Same-person scores 0.70–0.89, best stranger score ≤ 0.29.

**Findings:**
- **One-face rule (DECIDED 2026-11-01: accept the dominant face, see "Dominant face" below):** 4 of 24 photos (1 enrollment, 3 of 4 verify photos) were refused with 422 because a small background face was also detected (main face 8–48x larger). In a scratch check, using the dominant face matched all three verify photos correctly (0.69–0.76 vs ≤ 0.16 next best). Options: keep strict (teacher retakes) or accept the dominant face when it is ≥ ~5x the next one's area; that changes a safety rule and needs re-testing. **For the demo, keep one person in frame.**
- Tight crops still fail detection (not re-tested; all photos were full-frame).
- Only 1 verify photo was usable, so the "different photo" evidence is mostly held-out photos from one session.

## Frontend changed (teammate commit 1940ccf, now in `develop`)
Login no longer calls the API (it uses hardcoded demo accounts in `DemoSessionContext`), and no page fetches from the backend. The "only login hits the API" statements above and in CLAUDE.md are out of date. Phase E must re-wire login as well as the data screens; tell the teammate before touching those files.

## Remaining

### Phase C: done (see "Done 2026-10-23")
Done. The one-face-rule decision was made on 2026-11-01 (PR #9 merged this branch into `develop`).

### Phase D status 2026-11-01 (EC2 deployed; checks partly done)
Full guide: `docs/aws-deployment.md` (steps, troubleshooting, hardening). Resource ids (instance, Elastic IP, bucket) are in the user's private memory and the AWS console, not here (public repo).

**Decisions (do not re-ask):** one EC2 instance (Docker Compose) + S3 + Caddy for HTTPS. Considered and dropped: Render, HF Spaces (Docker Spaces need a paid plan), Vercel for the backend (size limits), Cloud Run, ECS/RDS (costs more than one EC2 and takes more setup), Cloudflare Tunnel. **sslip.io hostnames** (`<dashed-ip>.sslip.io` and `api.<dashed-ip>.sslip.io`) are used until the user buys a domain.

**Done**
- Account: Free plan, **$120 credits for 180 days** (about $20 a month; a 24/7 c7i-flex.large is about $60+ a month, so **stop the instance when idle**). Root MFA, IAM admin user, budgets set. Region **ap-south-1 (Mumbai)**.
- S3 bucket (private; lifecycle: `attendance/` 60 days, `backups/` 14 days, `students/` kept). IAM role `classsight-ec2-role` (inline S3 policy + `AmazonSSMManagedInstanceCore`).
- EC2 c7i-flex.large, Ubuntu 24.04, 30 GB gp3 (not deleted on termination), termination protection, **IMDSv2 required with hop limit 2** (checked from a container: 200), Elastic IP. Security group: 80 and 443 open, **port 22 removed 2026-11-01; access is Session Manager only**. Server prepped (Docker, 2 GB swap, log rotation).
- Deployed with `./deploy.sh`: four containers up (backend healthy), valid Let's Encrypt certificate, `/health` and the frontend answer over HTTPS. Admin seeded. Scanners hit the site within minutes (all 404), as expected.
- Gotchas found: `docker compose exec` hangs with no output in Session Manager (use `docker exec` or `-T`); the first Session Manager shell is `ssm-user` (run `sudo -iu ubuntu`); `awscli` is not an apt package on Ubuntu 24.04 (snap, so cron needs `/snap/bin` on PATH).
- Harness vs EC2, first attempt (run `20261101-022823-ec2`) was **partial** (superseded by the full run below): setup, access control and the first enrollment (4 of 4 photos, status 200) passed; the second enrollment hit a socket write timeout. Cause: test photos average 3.1 MB (74 MB total) and the user's upload speed is about 200 KB/s (`REQUEST_TIMEOUT` is 300 s); the server was idle with no memory pressure. `e2e_scores.py` runs locally and is not EC2 evidence. The harness's cleanup removed the face data (S3 objects); the E2E teacher/classroom/student rows from that run are still in the EC2 database.

**Done 2026-11-01 (after the harness run):** leftover E2E rows cleared (the harness leaves its tagged rows again each run, so clear them after every run); `backup.sh` run by hand and uploaded to `backups/`; restore drill passed (dump restored into a scratch database with the same row counts, then dropped); nightly cron entry added (02:00 server time; skipped on nights the instance is stopped); EBS snapshot policy via Data Lifecycle Manager (tag `backup=daily` on the volume, daily 03:00 UTC, keep 3); instance rebooted once and came back by itself (health 200, valid certificate; containers, swap and cron confirmed by the user); port 22 removed from `classsight-sg`, Session Manager still works. Not yet confirmed: the first snapshot and the first cron backup (check `~/backup.log` and the Snapshots list after the next 02:00/03:00 with the instance running).

**Remaining**
1. Automation (agreed to do next): `scripts/ec2.sh start|stop|status` using a restricted IAM user, and a nightly auto-stop (EventBridge Scheduler) so credits are not drained.
2. Optional: buy a domain; then set `APP_HOST`, `API_HOST`, `VITE_API_BASE_URL` and `CORS_ALLOWED_ORIGINS` in `.env` and run `deploy.sh`.
3. Commit the doc changes, open the PR `feature/aws-ec2-deploy` into `develop` (after the checks pass, per the user), update CLAUDE.md if anything changes.

**Dominant face (2026-11-01, uncommitted):** `extract_main_face` in `face_recognition.py` is used by enroll and `/verify`; it keeps one face when its box area is >= `DOMINANT_FACE_AREA_RATIO` (5, untuned) times the next largest, otherwise returns all faces and the caller rejects (422, "found N"). `/process` still uses all faces. Tests: 75 pass (new ones in `tests/test_dominant_face.py` and `test_enrollment.py`). Augmented copies are kept only if they show one dominant face that matches the original photo (>= MATCH_THRESHOLD), so a bystander cannot enter the template; zero-area boxes are never "dominant". Real-model check on the original photos: the refused enrollment photo (area ratio 23.8) and all 3 refused verify photos are accepted, and all 4 verify photos match the right student (0.68-0.76, runner-up <= 0.16). Not covered: a bystander closer to the camera than the subject would be taken as the subject (teacher must keep one person in frame); the 5x ratio has no data between 1x and 8x; the EC2 server still runs the old code until `deploy.sh`.

**Dominant face deployed to EC2 (2026-11-01):** commits `b344c76` and `3c1c79b` pushed to `feature/aws-ec2-deploy` and deployed with `deploy.sh`; harness run `20261101-175735-ec2-dominant`: 41/41, 24/24 identified, 0 wrong, 0/24 strangers accepted, nothing refused. Recorded in `docs/e2e-verification.md`. The harness left its tagged test rows again; clear them.

**EC2 harness 2026-11-01 (run `20261101-170022-ec2-small`, resized copies):** 41/41 checks, 20/20 identified, 0 wrong, 0/20 strangers accepted; recorded in `docs/e2e-verification.md`. The harness rerun and the E2E row cleanup are done.

**Phase E notes from this work:** the frontend should downscale in the browser before upload (canvas `toBlob` JPEG ~0.8): about 1280 px long side for single-student verify (~150-300 KB), about 2000 px for group photos (~400-800 KB); consider a server-side upload size cap. Rerun the harness at the exact size the app sends. the frontend should downscale photos before upload (3 MB photos over a slow link time out); the deployed UI still shows mock data and demo logins, so the camera/verify flow can only be shown after Phase E.

### Phase E: frontend plan (document only)
`docs/frontend-plan.md`, written from the verified API:
- **Students page:** wire to the API (`face_enrolled`), with enroll + profile views.
- **Verify page:** camera capture, which needs HTTPS.
- **Attendance:** flow → `/process` → unverified list = roster minus matched → `resolveStudent` → `/confirm`.
- **History and reports:** from `/attendance/logs` and `/analytics`.

### Later (not in the MVP plan)
- Store the verification method on `attendance_records`.
- NFC: `nfc_uid`, a scan endpoint, Web NFC (Chrome on Android only).
- A `needs_review` state for borderline faces; liveness checks; consent records.
- Possibly move to RDS later (only `DATABASE_URL` changes).

## Resume checklist (next session)
**EC2 (Phase D):** the instance was **stopped on 2026-11-01** to save credits (confirm in the console). To resume: EC2 → Instances → Start; wait for 2/2 checks; the containers restart themselves (about 2 minutes); `curl https://api.<dashed-ip>.sslip.io/health` should return healthy. The Elastic IP and hostnames do not change. Then do the "Remaining" list above, starting with clearing the E2E rows. In a Session Manager shell: `sudo -iu ubuntu`, `cd ~/ClassSight/deployment`, `export COMPOSE_FILE=docker-compose.yml:docker-compose.ec2.yml`.

**Local stack (everything below):** the local containers were also stopped.
```bash
cd ~/ClassSight && git switch feature/aws-ec2-deploy && git pull
open -a Docker                                  # Docker Desktop must be running
cd deployment && docker compose up -d           # whole stack (COMPOSE_PROFILES=app,local in .env)
docker compose ps                               # backend should be (healthy)
cd ../backend && .venv/bin/python -m pytest -q  # expect 75 passed
```
- Frontend: http://localhost · API docs: http://localhost:8000/docs · local S3: http://localhost:8333. (The frontend container is the 2026-10-18 build, from before the teammate's change; `docker compose up -d --build frontend` refreshes it.)
- **Re-running the harness:** the dev DB has no users. Seed a throwaway admin, then run (use `example.com` addresses; the email validator rejects `.test`):
  ```bash
  cd deployment && docker compose exec -T -e SEED_ADMIN_EMAIL=e2e-admin@example.com -e SEED_ADMIN_PASSWORD=<pw> backend python -m app.db.seed
  cd ../backend && pip install requests
  E2E_ADMIN_EMAIL=e2e-admin@example.com E2E_ADMIN_PASSWORD=<pw> python scripts/e2e_verify.py --data-dir ~/classsight-data --label augment-off
  python scripts/e2e_scores.py --data-dir ~/classsight-data
  ```
  Augmentation-on pass: `ENROLL_AUGMENT=true docker compose up -d --force-recreate backend`, then back to default the same way. Clear the tagged rows afterwards (no delete endpoints): `delete from student_photos where student_id in (select id from students where roll_number like 'E2E%'); delete from students where roll_number like 'E2E%'; delete from classrooms where course like 'E2E %'; delete from users where email like 'e2e-%@example.com';`
- The full plan is also at `~/.claude/plans/abundant-orbiting-octopus.md` (outside the repo); this file holds everything needed.
- **First questions for the user:** (1) one-face rule: DECIDED, accept the dominant face (done, uncommitted). (2) Has the teammate been told login now uses demo accounts, before Phase E? (3) Rerun the EC2 harness with the original photos or resized copies? (4) Build `scripts/ec2.sh` and the nightly auto-stop now?
