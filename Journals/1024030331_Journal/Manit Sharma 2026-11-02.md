# Manit Sharma: Weekly Journal

## What I worked on
Put the app on a real AWS server with HTTPS, fixed face matching for photos that have a second face in the background, and connected the frontend to the real backend so the main screens now use live data.

- **Cloud deployment:** the app runs on one AWS server (EC2) in the Mumbai region with HTTPS. Photos are in a private S3 bucket, and the server gets access through its IAM role, so there are no stored keys. Nightly database backups and daily disk snapshots are set up. I stop the server when I'm not using it to save AWS credits.
- **Face matching:** photos with a small face in the background were being refused. The system now uses the main face when its area is at least 5 times the next largest. On the 5 students, 24 of 24 photos were identified, none matched wrongly and no stranger was accepted. The thresholds are still untuned.
- **Frontend connected:** real login, admin setup of teachers and classes, the student roster, face enrolment, verify and taking attendance all use the API now. The dashboard shows today's lectures from the timetable, and its look hasn't changed.
- **Lectures and sections:** each class has a weekly lecture slot. Students belong to a section, and every class of that section shares them. Teachers can only add classes to sections they already teach, and only admins manage the roster.
- **Testing:** 108 backend tests pass. A script that runs the live API on EC2 passed all 41 checks.

## Problems I ran into
- **Slow uploads:** full-size photos (about 3 MB each) timed out on my connection. The browser now shrinks photos before uploading them.
- **Server access:** I closed the SSH port and use AWS Session Manager instead. In that shell, `docker compose exec` hangs, so I use `docker exec`.
- **Backups:** the AWS command-line tool is a snap package on Ubuntu, so the cron job needs its path set.
- **Local port clash:** a Docker backend container was holding port 8000, so the local API wouldn't start until I stopped it.

## Still to do
- Try the camera on the live HTTPS site. I haven't tested it yet.
- Add the real teacher, class, lecture and students before the demo.
- Build the Reports page from real attendance data. It still shows sample data.
- Automate starting and stopping the server to save credits.
- Tune the thresholds with more students. So far I have only tested 5.
- Check that the first automatic backup and snapshot ran.
