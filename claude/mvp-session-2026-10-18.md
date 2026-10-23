# MVP session: 2026-10-18

Picks up from `claude/face-recognition-session.md` (2026-10-11). This file is the
handoff for the next session: what was decided, what is done and verified, and
what remains. Read this first.

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
- **Augmentation:** `ENROLL_AUGMENT` (mirror + ±40 brightness), off by default. Keep it only if Phase C shows it helps. Real varied photos matter more.
- **A wrong match is worse than a miss.** Thresholds `MATCH_THRESHOLD` 0.5 / `AMBIGUITY_MARGIN` 0.05 are untuned until Phase C.
- **Local S3 is SeaweedFS**, not MinIO: MinIO's free images are no longer published on any registry.
- **No fake data:** the seed script creates the first admin only.
- **AWS:** the user has **no AWS account yet**; they'll create a new one (credit-based Free plan, see Phase D).

## Working agreements (user preferences)
- **Phase by phase:** finish one phase, verify it, report, and **wait for approval before committing or starting the next phase**.
- **No Claude attribution** in commits/PRs. Set in `~/.claude/settings.json` (`attribution` all empty). Old commit `3bbacc3` (already pushed) still has a Sonnet co-author line; rewriting it needs a force-push, which has **not** been approved.
- Explain changes file by file, with the reason for each.
- Ask before AWS actions (they cost money and are visible outside the machine).

## Branches and commits
| Branch | Commit | What |
|---|---|---|
| `feature/face-recognition-model` (pushed) | `cf0d02e` | Phase A + DB setup fixes |
| | `ff9ff27` | One matching path (`identify_face` removed) |
| `feature/containerization-ec2` (pushed, from the branch above) | `c87eb11` | Phase B containers |

**Update 2026-10-23:** PR #8 merged these into `develop`, and the old feature branches were deleted (local and GitHub). Phase C continues on `feature/e2e-verification`, branched from `develop`. `develop` also now holds a teammate's frontend rewrite (see "Frontend changed" below).

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
- **Verify:** `POST /classrooms/{id}/verify` takes one photo with exactly one face (else 422).
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
- **Frontend data screens are still mock.** Real attendance history is only visible through `/docs` until Phase E.
- **Browser camera capture needs HTTPS** on EC2 (a domain + TLS). Not needed for backend testing.
- `HTTP_422_UNPROCESSABLE_ENTITY` deprecation warnings appear across the codebase; pre-existing and harmless.

## Phase C status (2026-10-23): harness built and run, report awaiting review
- `backend/scripts/e2e_verify.py` (HTTP), `e2e_scores.py` (offline sweep), `e2e_common.py`; report in `docs/e2e-verification.md`. Not committed yet.
- Result: 41/41 checks, 0 wrong matches, 0 false accepts on 5 students; thresholds stay at 0.5 / 0.05 (data too thin to tune); augmentation stays off.
- **Open decision:** photos with a small background face are refused (4 of 24). Option: accept the dominant face when it is much larger (e.g. 5x area).
- Data: `~/classsight-data` (5 students, no unknown-person photos; strangers simulated by leaving one student out). Results in git-ignored `e2e-results/`.
- Dev DB and bucket were emptied after the runs.

## Frontend changed (teammate commit 1940ccf, now in `develop`)
Login no longer calls the API (it uses hardcoded demo accounts in `DemoSessionContext`), and no page fetches from the backend. The "only login hits the API" statements above and in CLAUDE.md are out of date. Phase E must re-wire login as well as the data screens; tell the teammate before touching those files.

## Remaining

### Phase C: local end-to-end with real photos (next)
**Needs from the user:** a data folder **outside the repo**, plus confirmation that the students consented:
```
classsight-data/
├── students.csv            # roll_number,name
├── enroll/<roll_no>/       # 3–5 photos each, ONE face, head+shoulders, varied light/angle
└── verify/
    ├── <roll_no>_a.jpg     # DIFFERENT photos of enrolled students (expected answer in the name)
    └── unknown_1.jpg       # people NOT enrolled (must be rejected)
```
Build `backend/scripts/e2e_verify.py`, a harness over HTTP against the running containers:
1. health → seed admin → create teacher → classroom → students
2. enroll (check S3 objects exist) → list + profiles
3. verify every test photo
4. a second teacher gets 403
5. delete one enrollment and confirm it's gone

Also:
- **Save** every request/response and the backend logs to `e2e-results/<timestamp>/`. Add it to `.gitignore`, since it holds real names.
- **Run two passes:** `ENROLL_AUGMENT` off and on. Report accuracy, false accepts, misses and score distributions, then **tune the thresholds**.
- **Report:** `docs/e2e-verification.md` with no photos and roll numbers hidden.

### Phase D: AWS EC2 (after C)
**Account:** new account, so the Free plan applies: $100 + up to $100 credits, 6 months or until the credits run out. When it ends the account is **suspended, with data kept 90 days**. Upgrade to Paid before then to keep data.

Each step is approved by the user first:
0. **Account safety:** MFA on root, a separate IAM admin user, an AWS Budget alert (e.g. $10).
1. **S3 bucket:** private, Block Public Access, default encryption. A lifecycle rule expires `attendance/` after 60 days; keep `students/` and `backups/`.
2. **IAM role / instance profile:** Get/Put/DeleteObject on that bucket only.
3. **EC2:**
   - **c7i-flex.large** (4 GB, free-plan eligible; t3.small 2 GB is too tight), Ubuntu 24.04, Docker, 30 GB gp3.
   - Security group: SSH from the user's IP only, plus 80 and 8000.
   - **Termination protection on**, and the root disk set to not be deleted on termination. **Stop keeps the data; terminate deletes it.**
   - An Elastic IP is optional: the IP changes on stop/start, and the frontend has the API URL baked in at build time.
4. **Backups (option A, chosen by the user):**
   - A nightly `pg_dump` → `s3://<bucket>/backups/`, keeping 14.
   - Daily EBS snapshots via Data Lifecycle Manager, keeping 7.
   - A restore drill.
5. **Deploy:** clone the repo, create `deployment/.env` (`COMPOSE_PROFILES=app`, strong `JWT_SECRET_KEY`/`POSTGRES_PASSWORD`, `VITE_API_BASE_URL=http://<ip>:8000`, `CORS_ALLOWED_ORIGINS=["http://<ip>"]`), then run `docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build`.
6. Run `e2e_verify.py` against EC2 and add the EC2 results to the report.

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
```bash
cd ~/ClassSight && git switch feature/e2e-verification && git pull
open -a Docker                                  # Docker Desktop must be running
cd deployment && docker compose up -d           # whole stack (COMPOSE_PROFILES=app,local in .env)
docker compose ps                               # backend should be (healthy)
cd ../backend && .venv/bin/python -m pytest -q  # expect 61 passed
```
- Frontend: http://localhost · API docs: http://localhost:8000/docs · local S3: http://localhost:8333
- The full plan is also at `~/.claude/plans/abundant-orbiting-octopus.md` (outside the repo); this file holds everything needed.
- First question for the user: "Is `classsight-data/` ready, and where is it?"
