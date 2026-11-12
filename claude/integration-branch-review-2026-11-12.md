# Review of `integrate/frontend-ui-on-develop` (2026-11-12)

**Goal of the branch:** put the new frontend UI on top of `develop` and keep every screen connected to the working backend.

**Result:** the new UI is in and login is real, but most teacher screens that were connected to the backend on `develop` now show sample data, and some pages are gone. The admin area is the only part fully connected to the backend.

**How this was checked:** the branch was compared with `develop` (9 commits ahead, frontend files only, backend unchanged) and the code was read. `npm run build` passes; `npm run lint` shows warnings only. The pages were not yet clicked through in a browser.

## 1. Pages and routes that no longer exist

- **Verify page (`/verify`)**: `pages/Verify.jsx` and its route are deleted. There is no screen to check one captured photo against the class.
- **Real attendance page**: `pages/TakeAttendance.jsx` is deleted. `/attendance` and `/attendance/:sessionId` now open a demo page instead.
- **Real roster page**: `pages/Students.jsx` (API-backed) is deleted. `/students` now opens a mock student directory.
- **Camera component**: `components/CameraCapture.jsx` is deleted. No page can capture a photo from the camera.
- **Old demo review pages are back**: `/attendance/verified` and `/attendance/unverified` were retired on `develop` (they redirected to the real page). They are live again and show demo data.

## 2. Features that are missing

- **Face enrollment**: no screen can enroll a student's face. It was in the old Students page. The new admin Classes page shows "Enrolled / Not enrolled" but has no enroll action.
- **Viewing or deleting a student's face data**: the student profile pop-up that did this is gone.
- **Taking real attendance**: no screen creates a session, uploads a class photo, runs face recognition or confirms the records.
- **Single-photo verification**: gone with the Verify page.
- **Admin access to the roster page**: admins are now redirected from every teacher page to `/admin`, so they cannot open `/students` at all.

The API functions for all of the above still exist in `src/api/`, but nothing calls them:
`createSession`, `uploadSessionPhoto`, `processSession`, `confirmSession`, `verifyPhoto`, `enrollSectionFace`, `deleteSectionFace`, `getSectionStudent`.

## 3. Screens that were on real data and are now on sample data

- **Attendance**: was the real flow; now reads `pages/AttendanceSession/attendanceMock.js`.
- **Students**: was the real roster from the API; now reads `pages/Students/studentsMock.js`.
- **Dashboard, today's lectures**: was `GET /lectures` for today; now built from the hardcoded timetable in `data/schedule/timetable.js`. The loading, error and retry states were removed.
- **Dashboard, attendance counts**: was today's saved attendance logs; now the local demo attendance state.
- **Dashboard, greeting**: was the signed-in user's name; now the fixed text "Professor Jhonsy".
- **"Add Lecture" on the dashboard**: changes the list in the browser only; nothing is saved to the backend.

## 4. What still works on the real backend

- **Login and sign-out**: real API login. New: "Remember me", and admins go to `/admin`, teachers to `/dashboard`.
- **Admin area (new)**: `/admin` dashboard, users, classes, attendance and analytics all read from the API.
- **Admin setup**: same page as on `develop`, now at `/admin/setup` (create teachers, classes, lecture times).
- **Admin Classes**: can create sections and add students through the API.
- **Teacher Settings**: reads the signed-in user from the API.

## 5. Unchanged from `develop` (sample data before, sample data now)

- Reports, All Reports, Report Details
- Classes
- Class Schedule
- Student preview (`/student/preview`)
- Student portal (`/student/...`): still not reachable, because there are no student accounts in the backend

## 6. Other data and code that came in with the new UI

- **Hardcoded demo accounts**: `context/demo-session/demoSession.js` lists one teacher and one student `@thapar.edu` email, with a name and a roll number. No passwords.
- **Hardcoded teacher email** in `components/navigation/TeacherProfileMenu.jsx`.
- **A second, mock sign-in system**: `DemoSessionContext` sits beside the real `AuthContext`. Only the student portal pages use it.
- **New mock data files**: `studentsMock.js`, `reportsMock.js`, `attendanceMock.js`, `studentTimetable.js`, with invented names and `@college.edu` emails.
- **New dependency**: `motion` (animations).
- **Leftover files nothing uses**: `hooks/useTodayAttendance.js`, `lib/resizeImage.js`, `components/Modal.jsx`, `components/ClassPicker.jsx`.
- **Stale comments** in `App.jsx` call the route guards a "mock role check"; they use the real login.

## 7. What needs doing before this can merge into `develop`

- Connect the new Attendance screen to the real session, photo, process and confirm API calls.
- Connect the new Students screen to the real roster.
- Put face enrollment (and view/delete face data) into the admin area, since the roster is admin-managed.
- Bring back Verify and the camera component.
- Put the Dashboard back on `GET /lectures` and today's logs, with the signed-in user's name.
- Remove the hardcoded names, emails and demo accounts from the teacher screens.
- Remove or reuse the leftover files in section 6.

The deployed site follows `develop`, so merging the branch as it is would remove working attendance from the live site.
