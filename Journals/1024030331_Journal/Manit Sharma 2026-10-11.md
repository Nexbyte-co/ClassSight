# Manit Sharma: Weekly Journal

## What I worked on
Started building the face recognition part of ClassSight, so the app can work out which students are present from a photo of the classroom.

**Planning**
- I looked at the existing code. The face recognition part was only a placeholder that never found anyone.
- I decided to use a pretrained model (InsightFace) instead of training one from scratch. Training needs far more data and computing power than we have.
- I decided how the data should be stored: a student's face is turned into a list of numbers (an "embedding") and saved in the database, and the classroom photos go to S3. The model never reads from S3 directly. The backend downloads the photo and hands it over.
- Wrongly marking a student present is worse than missing one. So the system only accepts a match when it is very sure, and anything uncertain goes to NFC or manual confirmation.

**Coding**
- Wrote the matching logic that compares the faces in the classroom photo with the enrolled students.
- Added an enrollment endpoint, where a teacher uploads a few close-up photos of a student. Only the embedding is saved, never the photos.
- Connected the attendance processing step to S3 and the new matching code.
- Wrote 11 tests for the new code.
- Created a feature branch, committed my work and pushed it to GitHub. I also deleted an old branch that was already merged.

## Problems I ran into
- **Library compatibility:** I wasn't sure the face recognition library would install on Python 3.13. I tested it in a separate environment and it worked.
- **A failing test:** one of my tests failed. The mistake was in the test, not the real code. The random noise I added was too big, so the "same person" vectors didn't look alike. I reduced it and all tests passed.
- **Import error:** a test run failed with "No module named app". It was a Python path problem, and I fixed it by setting the path when running the tests.
- **Commit not on GitHub:** at first my commit didn't show up on GitHub. I had only committed locally and forgotten to push, so I pushed it.

## Still to do
- I haven't tried the model on real photos yet. The thresholds I picked are guesses and need tuning with real data.
- AWS (S3 bucket and permissions) isn't set up yet.
- The frontend still uses fake data and needs to be connected to the real backend.
