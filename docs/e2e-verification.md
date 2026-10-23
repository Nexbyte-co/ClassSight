# Phase C: end-to-end verification report

Date: 2026-10-23. Branch: `feature/e2e-verification`. Stack: the Docker Compose containers (backend, Postgres, local S3), model `buffalo_l`, `MATCH_THRESHOLD` 0.5, `AMBIGUITY_MARGIN` 0.05.

## Summary

- Enrollment, verification, access control and photo deletion all work end to end over HTTP. 41 of 41 checks passed, in both passes.
- On the photos the system accepted, it made **no wrong matches and no false accepts**: 20 of 20 same-person probes identified correctly, 20 of 20 strangers rejected.
- **The thresholds are not tuned.** Five people cannot show where to put them. Every threshold from 0.30 to 0.65 gives identical results on this data, so there is no evidence to change 0.5 / 0.05. They stay.
- **Augmentation shows no benefit** (see below). It stays off.
- **One real problem:** 4 of 24 photos (17%) were refused because a second, small face was in the background. The one-face rule needs a decision (see Findings).

## Data and method

Five students (S1 to S5), 3 to 5 enrollment photos each (20 in total), and 4 verification photos (one each for S1, S3, S4 and S5). Photos were provided with the students' consent and are not stored in the repo. There were **no photos of unknown people**, so strangers were simulated by removing one student from the class and verifying that student's photos against the other four. Rotating through all five gave the stranger probes.

| Probe | How | Expected |
|---|---|---|
| held-out | enroll a student without photo P, verify P | identified |
| known | verify the separate test photo against the full enrollment | identified |
| stranger | remove the student's face data, verify their photos | rejected |

`backend/scripts/e2e_verify.py` runs these through the real API (what a teacher's app would call). `backend/scripts/e2e_scores.py` replays the same probes in memory with the app's own matcher, to see the best score and runner-up that the API does not return. Its scores agreed with the API run to the third decimal, so the two are consistent.

## Results

| | Augmentation off | Augmentation on |
|---|---|---|
| Checks passed | 41 / 41 | 41 / 41 |
| Same person identified | 20 / 20 | 20 / 20 |
| Wrong person matched | 0 | 0 |
| Strangers accepted | 0 / 20 | 0 / 20 |
| Verify probes the API refused (3 distinct photos, one tried as a stranger too) | 6 | 6 |
| Enrollment photos the API refused | 1 | 1 |
| Same-person score, min / mean / max | 0.696 / 0.815 / 0.891 | 0.713 / 0.822 / 0.894 |
| Best stranger score, min / mean / max | 0.062 / 0.160 / 0.277 | 0.064 / 0.165 / 0.290 |
| Gap (lowest same-person minus highest stranger) | +0.419 | +0.423 |

Checks covered: health, login, a second teacher getting 403 on list, enroll and verify, verifying with nobody enrolled, enrolling all students, the roster flags, the profile photo list and link, and delete. After a delete the profile is empty and the old photo link returns 404. The dev database and bucket were empty again afterwards.

## Thresholds

A sweep of threshold (0.30 to 0.70) and margin (0 to 0.10) over these probes gave the same 20/20 correct and 0/20 false accepts everywhere from 0.30 to 0.65. At 0.70 one same-person probe was missed with augmentation off. The current 0.5 / 0.05 sits well inside the gap between strangers (at most 0.29) and same-person scores (at least 0.70).

This does not show the thresholds are right, only that these photos don't contradict them:

- **Five people.** With more students, some pairs will look alike and the best stranger score will rise. 0 false accepts in 20 stranger probes only bounds the true rate below about 14% at 95% confidence.
- **Probably one session.** The enrollment photos have consecutive camera numbers, so they were taken back to back. The one usable verification photo has a different resolution, but when it was taken is unknown. Same-person scores may be higher than on another day, in other light, or with glasses or a haircut.
- **Strangers are classmates.** They are the other four students, with the same background and camera, which is a fair test, but not a stranger from outside the class.
- **Margin untested.** The ambiguity margin only matters when two students are close, and nothing here came close. The API does not return the runner-up, so the HTTP run cannot show it.

Next step for tuning: 15 to 20 students and verification photos taken on a different day and in the classroom.

## Augmentation

Mirroring and brightness shifts raised the lowest same-person score by 0.017 and the best stranger score by 0.013. Neither changes any result at a sensible threshold. Enrollment with augmentation also costs about four times the detection work. **Keep it off** unless later data shows a gain.

## Findings

1. **A second face in the background gets the photo refused.** Enrollment and verification both require exactly one face. In 4 of the 24 photos (1 enrollment, 3 of the 4 verification photos) a smaller face was detected behind the subject, and the API refused them with 422. In every case the main face was 8 to 48 times the area of the other. A crowded classroom makes this likely.
   - Exploratory check, not an implemented change: using the largest face when it is clearly dominant would have matched all three refused verification photos to the right student, with scores of 0.69 to 0.76 against at most 0.16 for any other student. The refused enrollment photo's main face scored 0.67 against the same student's other photos, while its background face scored -0.04, so the background face is a different person.
   - Decision needed: keep the strict rule (safest, teachers retake the photo), or accept the dominant face when it is much larger than the rest (for example 5 times the area). A looser rule must be tested again before it is trusted, because a wrong match is worse than a miss.
2. **Tightly cropped faces fail detection.** Known from earlier sessions (a 112 x 112 crop gives 0 faces). It was not re-tested here, since all photos were full-frame. Enrollment photos need head and shoulders with background.
3. **Only 1 verification photo was usable.** The held-out probes (19) stand in for different photos of the same person, but they come from the same session as the enrollment photos.

## Not covered

Group-photo attendance (`/process`), more than five students, different days and lighting, spoofing (a photo of a photo), the NFC flow, and anything on EC2 (Phase D).

## Reproduce

```bash
cd deployment && docker compose up -d            # stack with COMPOSE_PROFILES=app,local
docker compose exec backend env SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=... python -m app.db.seed
cd ../backend && pip install requests
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... python scripts/e2e_verify.py --data-dir ~/classsight-data --label augment-off
python scripts/e2e_scores.py --data-dir ~/classsight-data    # offline scores and threshold sweep
```

For the augmentation-on pass, recreate the backend with `ENROLL_AUGMENT=true docker compose up -d --force-recreate backend`. The harness does not check this setting; confirm it in the backend log ("augmented copies used" lines). Results are written to the git-ignored `e2e-results/`. The API has no endpoint to delete students, users or classrooms, so each run leaves tagged rows (`E2E...` roll numbers, `e2e-*@example.com` users) in the dev database to clear by hand.
