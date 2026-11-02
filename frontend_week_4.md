# ClassSight Frontend Improvements

## Attendance

1. **Shared attendance roster.** Each class now keeps its own attendance record, so changes to one class no longer affect another.
2. **Schedule lost on navigation.** Schedule and active-session state are shared and saved in the browser, so edits survive navigation and reloads.
3. **Photo upload verified students without a photo.** "Upload Another Photo" now opens a file picker, and students are verified only after a valid image is chosen and the scan completes.
4. **"Keep Absent" left students in the queue.** Confirmed-absent students move to their own list and no longer count as needing action.
5. **Misleading completion messages.** Messages now reflect the real counts: all verified, review complete with absences, or no students.
6. **No way to correct mistakes.** Confirmed-absent students can be returned to the queue, and verified students can be moved back on the full Verified page.
7. **"Saved" shown after later changes.** Changes after saving mark the session as unsaved, and the Dashboard shows "View Saved Attendance" only when the record is current.
8. **Sessions not date-aware; upgrade risk.** Sessions are date-aware. Old data is backed up before migration, original keys are never deleted, and a valid new store is never overwritten.

## Reports

1. **Reports showed only demo data.** An Attendance Sessions section lists saved sessions (newest first) with counts, percentages, status, search, date presets and summary figures.
2. **Deleted lectures vanished from history.** They stay listed, marked "Lecture removed from schedule", without an Open button.
3. **Past sessions showed current class details.** Each session stores the class details from the day it was first changed.
4. **Inconsistent navigation on report pages.** All report pages use the same navigation drawer, so the same six items appear everywhere.

## Navigation drawer

1. **Drawer covered the page and was hard to close on touch.** On desktop it slides in and pushes the page aside, with no dimming or blur.
2. **Narrow-screen drawer.** On narrow screens the drawer overlays the page without dimming.
3. **Drawer closing.** It closes on Escape, on pointer leave after about 250 ms, or on a tap outside.

## Settings

1. **Settings was an empty placeholder.** Settings are grouped into Attendance preferences, Appearance and Account. Unavailable features are labelled "Requires server".
2. **Attendance threshold not applied.** The threshold (default 75%) is a real setting that drives the Students list, detention badges and the student view.
3. **Unsaved edits lost silently.** Leaving with unsaved edits opens a stay-or-discard dialog, and confirmation appears only after a successful save.

## Student portal and sign-in

1. **No student experience.** A separate portal has its own navigation, a greeting, a weekly attendance chart and subject-wise attendance. Figures are labelled as sample data.
2. **No role-based routing.** Demo sign-in routes each approved account to its own area. Wrong-role and signed-out visitors are redirected, and sign-out returns to the landing page.

## Teacher interface redesign

1. **Inconsistent teacher interface.** One scoped design system (`styles/teacher.css`) provides burgundy tokens for light and dark themes, a shared header, one profile menu showing the full name and PJ avatar, one notifications menu, and consistent cards, buttons, badges and tables.
2. **Status conveyed by colour alone.** Each status has a text label: present is green, unverified amber, confirmed absent neutral grey.
3. **Dialogs ignored focus.** Focus stays inside dialogs, Tab is contained, Escape closes them, and focus returns to the opening button.
4. **Dropdowns ran off phone screens.** On phones, the profile and notifications menus span the screen width under the header.

## Known limitations

1. **Demo sign-in only.** It checks the email address alone and can be bypassed; real authentication and server-side permissions are needed before production.
2. **Mock data.** Dashboard, Students, Attendance, Reports and Classes still use mock data; only login uses the API.
3. **Demo notifications.**
4. **Limited browser testing.** Tested in headless Firefox only, not Chrome, Safari, real phones or screen readers.
5. **Not committed.**
