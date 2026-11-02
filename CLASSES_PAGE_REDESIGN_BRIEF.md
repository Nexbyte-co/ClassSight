# Brief: redesign the Classes page (ClassSight)

Paste this file to Claude Code (or `@CLASSES_PAGE_REDESIGN_BRIEF.md`). Edit the "My direction" section first.

## My direction (draft, edit me)
- What I dislike now: too many boxed cards and tiles, rows feel heavy, KPI tiles take too much space.
- Look/feel I want: open and airy like Students > "Attendance by day". Fewer borders, more whitespace, one clear hierarchy.
- Must keep: all four KPIs, search + year filter, attendance bars with first-visit animation, detail modal behaviour.
- Reference: Students page and the Attendance session page.

## Scope
Redesign **All Classes** at `/classes` and keep it visually consistent with its sibling tab **Class Schedule** (`/classes/schedule`). Visual/layout redesign only. Do not change the data layer, routes, or behaviour unless I say so.

Files:
- `frontend/src/pages/Classes/index.jsx` — page (search, year filter, KPI tiles, class rows, detail modal)
- `frontend/src/pages/Classes/Classes.css` — page styles (~420 lines)
- `frontend/src/pages/Classes/ClassSchedule.jsx` / `ClassSchedule.css` — sibling page
- `frontend/src/components/classes/ClassesTabs.jsx` — tab switcher (uses View Transitions; keep the `waitForTab` logic)
- `frontend/src/components/navigation/TeacherShell.jsx` — shared shell
- Data: `frontend/src/data/schedule/timetable` (`SLOTS`, `COURSES`, `YEARS`, `HEALTHY_ATTENDANCE`, `endTime`). Still mock.

## Current page contents (keep all of this)
- Four KPI tiles: Total Courses, Student Groups, Lectures Held, Avg. Attendance
- Search box (code, name, venue, group, year, day) + year filter (`All` + `YEARS`)
- List of class slots with code, name, venue, day/time, group, attendance bar (tone `ok`/`warn` from `HEALTHY_ATTENDANCE`)
- Click a row opens a detail modal (`useDialogA11y`: focus trap, Escape, focus return)
- Attendance bars animate only on first visit (`barsHaveGrown`); keep that
- `ClassesTabs` above the content

## Design rules (from CLAUDE.md, mandatory)
- Follow root `DESIGN.md` for structure only: spacing scale, radius (8px controls, 12px cards), type scale (28px page titles), component sizes. Ignore its colours.
- Colours = burgundy tokens in `frontend/src/styles/teacher.css` (`--cs-*`, light + dark). Never hard-code hex in page CSS.
- Shared teacher rules go in `teacher.css` (scoped `.teacher-ui`). Overrides need the `.db-page.teacher-ui` prefix to beat `Dashboard.css`. Section 23 holds page-consistency rules (gutter, titles, 40px toolbar controls, 32px row actions).
- Support light + dark theme and 390px mobile width. Respect `prefers-reduced-motion`.
- Keep accessibility: labelled controls, visible focus, `sr-only` text for icon-only status.
- Stack: React 19, React Router v7, Vite, lucide-react icons, plain CSS.

## Process
1. Read the files above and `DESIGN.md` first; screenshot the current page.
2. Show me 2 layout options in a few lines and wait for me to pick one before building.
3. Verify with the `playwright-cli` skill (`--browser=chromium`): widths 1440, 1920, 1200 and 390, sidebar collapsed, and dark mode. Also check `/classes/schedule` still looks consistent.
4. Run `cd frontend && npm run lint` and `npm run build`.
5. Summarise what changed. Don't commit unless I ask.
