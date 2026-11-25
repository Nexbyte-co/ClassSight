# Manit Sharma: Weekly Journal

## What I worked on
Merged the new frontend design into `develop` without losing the working backend features, then connected the remaining screens to real data so that every teacher and admin page now runs on the API.

- **Integration review and restore:** the new-UI branch had replaced the real teacher screens with sample data and deleted Verify, the camera component and face enrolment. I compared it with `develop`, wrote a review and a restore plan (both in `claude/`), and put the real behaviour back under the new look. The Dashboard shows today's lectures and the signed-in teacher's name, Attendance runs the full flow (class photo or camera, face scan, review, save), Verify is back, and admins enrol student faces on a new Students page.
- **Classes and Class Schedule:** both now show the teacher's real timetable, with attendance % per class from the analytics endpoint. Tiles are no longer cropped.
- **Class hours 08:00 to 20:00:** the backend rejects lectures outside these hours, the admin form limits the time inputs, and the pages hide any stored lecture outside the window. Backend tests grew from 108 to 112 and all pass.
- **Attendance record and CSV:** the page had no list of who was present and no export. A new record card lists every student as Present, To review or Absent. Two buttons download a CSV for that day, or one sheet with a column per saved day. It opens in Excel, and past days can be viewed through the date in the URL.
- **Reports:** Reports and Report details are computed from saved attendance instead of sample data, with loading, error and empty states. "Labs" became "Classes", because the API does not record lab versus lecture.
- **End-to-end test:** in the browser I created a teacher, a class, a lecture and two students as admin, enrolled their faces, then signed in as the teacher and took attendance. The group photo recognised 1 of 2, "Check by photo" resolved the other, and the saved record matched the database.
- **PRs and docs:** #12 and #13 merged into `develop`. I updated `CLAUDE.md` and `PROJECT_STATUS.md` to match.

## Problems I ran into
- **Mock data hiding in the merge:** the new UI looked finished, but most screens were not calling the API. I found it only by comparing against `develop` and clicking through each page.
- **Disabled photo buttons:** the upload and camera buttons were greyed out once a day's attendance was saved, which looked like an unwired page. I removed the lock.
- **Strict face matcher:** a group photo usually recognises only some students. The thresholds are untuned, so a teacher resolves the rest with "Check by photo".
- **Local testing:** the file chooser only reads photos from inside the repo, and uploaded test photos had to be deleted afterwards.

## Still to do
- Deploy to EC2: take a backup first, then run `deploy.sh` and check the existing teacher, student and admin data afterwards.
- Try the live camera on the HTTPS site. It has never been tested.
- Wire All Reports (`/reports/all`), which is still sample data, and the student portal.
- Move the site to a nicer free domain (DuckDNS) than the sslip.io one.
- Tune the face-match thresholds with more than 5 students.
