Rebuild the Students page (`/students`) to match `handoff/students/reference/ClassSight-Dashboard.html`, view `#vt` (click **Students** in the sidebar). Follow `handoff/students/SPEC.md` exactly, and match every image in `handoff/students/reference/screenshots/` in both light and dark mode.

Stack: React 19 + React Router 7 + plain CSS with our existing CSS variables, and lucide-react icons. No new libraries. Copy the visual values (spacing, radius, colours, font sizes) from the reference CSS; don't invent new ones.

Split it into these components: `StudentsPage`, `BatchDeck`, `StudentDeck` (with `DayStrip` and `DayTooltip`), `StatusLane`, `StudentCard`, `ViewAllModal`, and `AttendanceRing` (shared). Put the mock data in a typed `studentsMock.ts`, with the API swap points listed in the spec. Drive the Good / Warning / Critical bands from the attendance-threshold setting.

Work one component at a time. After each one, screenshot the page with Playwright at 1920×1053, 1440×900 and 390×844. Compare it with the reference screenshots and fix every difference before moving on. Don't redesign anything, and don't add features that aren't in the spec.
