Rebuild the Attendance session page (`/attendance/:sessionId`) to match `handoff/attendance/reference/ClassSight-Dashboard.html`, view `#va` (click **Attendance** in the sidebar). Follow `handoff/attendance/SPEC.md` exactly. Match every image in `handoff/attendance/reference/screenshots/` in both light and dark mode.

**Stack:** React 19, React Router 7, plain CSS with our existing CSS variables, and lucide-react icons. Don't add any new libraries. Copy the visual values (spacing, radius, colours, font sizes) from the reference's **computed** styles. Later CSS rules in the reference override earlier ones, so read the computed value in DevTools or Playwright. Don't invent values.

**Components:**
- `AttendanceSessionPage`
- `SessionHeader`
- `SessionSummary` (with `AttendanceRing` and `CountTiles`)
- `ReviewLane`
- `ResolveCard` (with `RecentLabs`)
- `AbsentLane`
- `FaceCheckCard`
- `UpNextCard`
- `SaveRecordModal`
- `UndoAbsentModal`

Put the session state in a `useAttendanceSession` reducer with these actions: select, resolve(method), keepAbsent, undo, faceConfirm, faceReject, save, edit and reset. Put the mock data in a typed `attendanceMock.ts`, and list the API swap points in the spec.

**The layout must be a single CSS grid** using the exact template areas, `contain: size` and `min-height` rules in the spec. Collapsing the sidebar or resizing must never leave gaps or let content spill out of a card. Use container queries on the page for the 1060px and 700px breakpoints.

**Work one component at a time.** After each one:
1. Screenshot the page with Playwright at 1920×1053, 1440×900, 1536×750 (sidebar collapsed), 1200×900 and 390×844.
2. Compare the screenshots with the reference.
3. Fix every difference before moving on.

**At the end:**
- Run through the full flow: select, NFC, Keep absent, Undo with confirm, Face check, then Save and Edit.
- Confirm there is no horizontal overflow at any width.

Don't redesign anything, and don't add features that aren't in the spec.
