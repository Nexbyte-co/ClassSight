# Plan: restore backend-connected features on `integrate/frontend-ui-on-develop`

## Context
The branch has the new UI, but the new Attendance and Students screens run on mock data and the
Verify page, camera component and face enrollment are gone (see `claude/integration-branch-review-2026-11-12.md`).
Goal: keep the new look, put the working `develop` behaviour back, work only on this branch,
then open one PR into `develop`. Backend is untouched (no backend work).

Approach (token-cheap): reuse the new UI components and `develop`'s working logic. Pull old files with
`git show origin/develop:frontend/src/<path>` (or `git checkout origin/develop -- <path>`), fix import paths
and swap the shell. No redesign, no new abstractions.

Working rules: stop after each phase and report; commit only when asked, no Claude attribution.
Run one read-only reviewer once, before the PR, not per phase (token limit).

## Phase 0: data layer + Dashboard (everything else depends on it)
- Replace `context/schedule/ScheduleContext.jsx` (mock timetable) with `develop`'s API version
  (`GET /lectures?weekday=today` via `api/lectures.js:listSchedule`; keeps manual/dismiss flags). Fix imports
  (`../AuthContext`, `../settings/SettingsContext`, `./scheduleStatus`). Keep the exports the new Dashboard uses.
- `pages/Dashboard/index.jsx`: data only, look unchanged: use `scheduleLoading` / `scheduleError` /
  `reloadSchedule`, `useTodayAttendance` (`hooks/useTodayAttendance.js`, still in repo) for counts, and the signed-in
  `useAuth().session.name` in the greeting (replace "Professor Jhonsy").
- `components/navigation/TeacherProfileMenu.jsx`: use the session name/email instead of the hardcoded teacher.
- Class picker: restore `ClassPicker` (still in `components/`, uses `ClassroomContext`) and render it in the content
  of the attendance, verify and students pages (not in the shell).

## Phase 1: Attendance on the real flow (core)
New UI stays: `pages/AttendanceSession/*` (ReviewLane, ResolveCard, AbsentLane, FaceCheckCard, SessionSummary).
- Restore `components/CameraCapture.jsx` from `develop` (`Modal.jsx` and `lib/resizeImage.js` already exist).
- Rewrite `useAttendanceSession.js` data source only (keep the reducer and its `p/u/a` row states):
  - load: `listStudents(classroomId)` + `listLogs(classroomId)` (reuse `develop`'s `TakeAttendance.load`, lines ~139-200);
    if today's session already has records, show them as saved.
  - scan(file): `createSession` (409 = reuse existing) -> `resizeImage(file, GROUP_MAX_SIDE)` -> `uploadSessionPhoto` -> `processSession`.
    Recognized students -> `st:"p", m:"ai"` with `confidence`; everyone else -> `st:"u"` (reason "Not found in the photo").
  - save: `confirmSession(sessionId, records)`; present = `status:"present"` (+ `recognition_confidence` only for `m:"ai"`), the rest absent.
  - Row gets `studentId` and `confidence`; `FaceCheckCard` shows the real confidence instead of `faceScore()`.
- `ResolveCard` "retake photo" action: reuse `develop`'s `RescanModal` (single-photo `verifyPhoto`) with `CameraCapture`.
- `AttendanceSession/index.jsx`: add the missing "scan class photo" step (button + `CameraCapture`/file picker), class from
  route `/attendance/:sessionId` (`class-<classroomId>_<date>`) via `parseSessionId` / `useSessionRoute`; drop `SESSION` / `UP_NEXT` mock
  (UP_NEXT from `scheduleList`).
- `App.jsx`: point `/attendance/unverified`, `/attendance/verified` and their `:sessionId` variants back to `<Navigate to="/attendance" replace />`
  (as on `develop`).

## Phase 2: Verify page
- Restore `pages/Verify.jsx` from `develop`, replace `PageShell` with `TeacherShell active="attendance"`, add `ClassPicker`.
- `App.jsx`: re-add `<Route path="/verify" element={<Verify />} />` under `TeacherArea`.
- One link to it from the Attendance header ("Check one student").

## Phase 3: Roster and face enrollment (admin)
- Restore `develop`'s `pages/Students.jsx` as `pages/AdminPanel/AdminStudents.jsx` (it already handles admin sections, add student,
  enroll face, profile, delete face). Remove the `PageShell` wrapper (it renders inside `AdminLayout`'s outlet); fix imports.
- `App.jsx`: `<Route path="students" element={<AdminStudents />} />` under `/admin`; add "Students" to the nav list in
  `components/admin/AdminLayout.jsx`.
- Teacher `/students` (read-only class roster): serve the same restored page inside `TeacherShell` for teachers
  (its `isAdmin` check already switches modes). The new mock directory (`pages/Students/index.jsx` + `studentsMock.js`) stays in
  the repo, unused by this route. Trade-off: teachers lose the new directory look until it is fed real data (follow-up).

## Phase 4: Cleanup and docs (minimum)
- Remove the stale "mock role check" comments in `App.jsx`; rewrite the Frontend section of `CLAUDE.md` (it wrongly says no page calls the API).
- Fix the Dashboard-"Add Lecture" line in the review notes (develop also only changed the list in memory).
- Do not delete the mock files or the student portal (out of scope).

## Verification
Start the stack as in `claude/mvp-session-2026-11-02.md` (Docker `postgres s3 s3-init`, `alembic upgrade head`, uvicorn on :8000 with the S3 env vars,
`npm run dev`). Use a local admin and a teacher (seed with `python -m app.db.seed`, then create the teacher under Admin); credentials are not
recorded here. Test photos: `~/classsight-data` (5 students).
1. Admin: `/admin/students` -> add a student, enroll 1-5 photos, profile shows photos, delete face works.
2. Teacher: Dashboard lectures match `GET /lectures` and the name is the signed-in user; class picker switches class.
3. Teacher: `/attendance/class-<id>_<today>` -> scan a group photo -> recognized students go Present, others Needs review ->
   resolve some -> Save -> `GET /attendance/logs` and the admin Attendance page show the records; reload keeps them.
4. Teacher: `/verify` with a known photo -> verified + confidence; a stranger -> not verified.
5. `npm run build` and `npm run lint` (no new errors). Backend `pytest` should still say 108 passed (unchanged).
Playwright (MCP, uploads only from under the repo, e.g. the git-ignored `.playwright-mcp/`; delete face photos after) can drive 1-4;
the live camera needs a manual check on the HTTPS site (never tried).

## Finish
Report, you review, then commit/push on this branch and open the PR into `develop` (title/body without Claude attribution).
