# Manit Sharma: Weekly Journal

## What I worked on
Finished student enrollment and verification, put the app into containers, and tested face recognition on real photos of 5 students.

- **Enrollment:** a teacher uploads 1 to 5 close-up photos of a student. The photos go to a private S3 bucket and the face embedding goes to the database. This reverses my earlier decision to never store photos, so a profile can now show them and they can be deleted. A student's roll number is their unique ID across the college.
- **Verification:** a teacher takes one photo and the system says who it is, how confident it is, and why. If it isn't sure, it says "not recognised" instead of guessing. Group photos and single photos use the same matching code.
- **Containers:** Dockerfiles for the backend and frontend, and a Docker Compose setup with a local S3. Merged into `develop` (PR #8).
- **Testing:** wrote scripts that run the real API end to end. On 5 students all 41 checks passed, the right person was identified 20 out of 20 times, and nobody was matched wrongly or accepted as a stranger. The thresholds stay at 0.5 and 0.05, because 5 students are too few to tune them.

## Problems I ran into
- **Docker password mismatch:** the database and the app used different passwords. I made them match.
- **Container crash:** the face library installed an OpenCV version that needs a screen. I switched to the headless one.
- **Local S3:** the free MinIO images are gone, so I used SeaweedFS.
- **No stranger photos:** for privacy I couldn't get photos of unenrolled people. I left one student out at a time and checked that their photos were rejected.
- **Photos refused:** 4 of 24 photos had a second face in the background and were refused. I haven't changed this rule yet.
- **Frontend:** after pulling `develop` I found a teammate's change. Login now uses demo accounts, so the frontend isn't connected to the backend.

## Still to do
- Decide how to handle photos with a small face in the background.
- Tune the thresholds with more students.
- Set up AWS (S3 and EC2) and run the same tests there.
- Connect the frontend to the real backend, after talking to my teammate.
