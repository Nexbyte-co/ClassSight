# ClassSight — Teacher Interface Design Brief

Handoff for a design pass on the **teacher side** of ClassSight. It covers what the product does, every teacher screen as built today (with screenshots), the current visual system, the inconsistencies we already know about, and the constraints a new design has to fit.

Screenshots are in `screenshots/`. They were taken on 25–26 Oct 2026 at 1440×900 (full-page), plus dark mode and 390px phone versions of the key screens. The clock was set to Monday 10:05 so a lecture is live.

---

## 1. Product in one paragraph

ClassSight is an AI attendance system for colleges. A teacher starts a lecture and takes **one photo of the classroom**; face recognition marks the students it recognises as present. Students it can't match (face hidden, bad angle, absent) land in an **Unverified** list. The teacher clears that list by confirming each student with a **library NFC card tap**, a **close-up photo**, or **manually**, then saves the record. A wrong match is worse than a miss, so the product is built around fast, trustworthy human review of the leftovers.

## 2. Who uses it

- **Teachers (primary).** College faculty who teach several sections a day, often from a laptop at the lectern and sometimes from a phone. Tech comfort varies widely. They have about 2–5 minutes at the start of a lecture to take attendance, so the core flow has to be quick and calm.
- **Students** have a separate read-only portal for their own attendance. It is out of scope here; the teacher only *previews* it (screen 12).

Demo identity on all screenshots: "Prof. Jhonsy", Dept. of CS & Eng, Spring Term 2026, Semester 6, Week 8.

## 3. Main jobs, in priority order

1. **Take attendance for the lecture happening now:** Dashboard → photo scan → review unverified → save.
2. **See today at a glance:** which lectures are done, live or next.
3. **Spot students at risk:** the 75% rule. Good ≥ 75%, Warning 65–74%, Critical < 65%. The threshold is configurable in Settings.
4. **Look back:** per-class trends, per-lecture history, exports (CSV, daily ledger).
5. **Browse classes and the weekly timetable.**

---

## 4. App frame (shared by every teacher screen)

- **Top bar (64px):** hamburger (collapses the sidebar on desktop, opens a drawer on phones), logo + "ClassSight", then on the right the date chip, theme toggle (moon/sun), notifications bell with a dot, and a profile menu (avatar initials, name, department).
- **Left sidebar (~256px, collapsible to icons):** Dashboard · Classes · Attendance (shows a green **Live** badge while a lecture is running) · Students · Reports · Settings. A burgundy pill slides behind the active item. At the bottom: a term card (Spring Term 2026 / CSE Dept. • Semester 6 / Academic Week 8) and "Log Out Faculty".
- **Phone (≤ 700px):** the sidebar is replaced by a slide-in drawer with the same six items.
- **Content area:** page padding is `clamp(16px, 1.8vw, 32px)`. Pages start with an icon tile + title + subtitle, with page-level actions on the right.

**Navigation decision already made:** sidebar items are flat, with no submenus. Sections with several views use **underline tabs** inside the page. Classes is the first example (All Classes / Class Schedule). Switching tabs runs a short view transition: the content fades and rises 6px, and the tab underline slides.

---

## 5. Screen inventory

| # | Screen | Route | Screenshots |
|---|---|---|---|
| 01 | Dashboard | `/dashboard` | `01-dashboard-{light,dark,mobile}.png` |
| 02 | Classes · All Classes | `/classes` | `02-classes-all-{light,dark,mobile}.png` |
| 03 | Classes · Class Schedule | `/classes/schedule` | `03-classes-schedule-light.png` |
| 04 | Attendance session | `/attendance/:sessionId` | `04-attendance-session-{light,dark,mobile}.png` |
| 05 | Unverified students (full list) | `/attendance/:sessionId/unverified` | `05-attendance-unverified-light.png` |
| 06 | Verified students (full list) | `/attendance/:sessionId/verified` | `06-attendance-verified-light.png` |
| 07 | Students directory | `/students` | `07-students-{light,dark,mobile}.png`, `07b-students-detail-modal-light.png` |
| 08 | Reports | `/reports` | `08-reports-{light,dark}.png` |
| 09 | All recorded lectures | `/reports/all` | `09-reports-all-lectures-light.png` |
| 10 | Report details (one class) | `/reports/details` | `10-report-details-light.png` |
| 11 | Settings | `/settings` | `11-settings-{light,dark}.png` |
| 12 | Student-view preview | `/student/preview` | `12-student-preview-light.png` |

### 01 Dashboard: "what's happening now"
- Big greeting: "Good morning, Professor Jhonsy" (about 40px, deliberately larger than other page titles).
- **Active session card:** red "ACTIVE SESSION NOW" pill, time since start, course name + code, then a strip with Batch/Section · Venue · Time. With no lecture running it shows a grey "NO ACTIVE SESSION" message instead.
- **Mark Attendance card:** segmented control (**AI Photo Scan** | **NFC Library Card**), a large dashed drop zone ("Upload Classroom Photo to Mark Attendance", JPG/PNG up to 20MB, wide panoramic recommended), and a "Last Batch Scan" result row (faces recognised, match rate, Log link). The NFC mode shows "Tap Library Card".
- **Right column:** *Schedule Overview* (Export Daily Ledger; stat tiles Today's Total, Next Lecture, Completed) and *Today's Lectures*, a scrollable list of lecture cards with time, course, section · room · code, and a state tag (**Active Now**, **Next Up**, **Scheduled**). Actions on the cards: Take Attendance, Dismiss Lecture, Start Early.
- Modals: Add/Edit Lecture, Edit Active Session, Delete Class.

### 02 Classes · All Classes
- Header: "My Classes" + semester select (Spring Term 2026), then the **tabs**.
- Four KPI cards: Total Courses, Student Groups, Lectures Held, Avg. Attendance.
- Toolbar: search (courses, codes, rooms) + Year chips (All Years / 2nd Year / 3rd Year / PG (1 MCA)).
- Three-column grid of class cards: course-code chip + group chip, course name, year · group, room · time · type (Lab/Lecture), average attendance with a Healthy/Needs-attention label and a progress bar, day chip, footer "Lab · 2 periods (100 min)" + "View details ›". View details opens a class-detail modal.

### 03 Classes · Class Schedule
- Header: "Class Schedule" + week navigator (‹ 25 Oct – 31 Oct › and a **Today** button), then the **tabs**.
- Weekly timetable, Sun–Sat by 08:00–13:50 in 50-minute rows. Today's column is tinted burgundy. Lecture blocks are colour-coded by course (red / blue / purple left border with a light fill).
- Right rail: a "Classes" legend with a coloured dot, course, section · code · day/time.

### 04 Attendance session (the core review screen)
- Header: "← Back to Dashboard", chips for section (3C2C), code (UCS503P) and state (**In Review**), course title, plus chips for date, time, room and department.
- **Unverified Students** card: count tag ("10 ACTION REQUIRED"). Table columns: student (avatar letter, name, *reason*, e.g. "Face partially occluded by cap", "Low lighting angle in rear row"), roll no., status ("Not Matched / Unverified", amber), and a **Resolve** button. Shows the first 8 with "Read More (10)".
- **Verified Students** card: "42 PRESENT". Columns: student, roll no., status (✓ Present, green), and **verification method** chip (**AI Match** blue, **NFC** purple, **Manual** grey). Shows the first 8.
- **Right rail, Attendance Summary:** donut chart (81% TURNOUT), legend Present & Verified 42 (81%) / Not Matched-Unverified 10 (19%) / Confirmed Absent 0, verification-method counters (AI Photo 34 · NFC Reader 5 · Manual 3), and "Reset Demo State".
- **Sticky bottom bar:** "Review in progress", a progress bar (42 of 52 reviewed), a sentence summary, and **Save Record** (primary).
- **Resolve modal**, with four options for one student: **NFC Verify** · **Upload Another Photo** (re-scan) · **Mark Present Manually** · **Keep Absent**. A **Save Record** confirmation modal follows the review.

### 05 / 06 Full unverified / verified lists
The same tables at full length, with search, a count chip ("10 OF 52 UNVERIFIED") and a back link. They use a centred, narrower content column, unlike the other pages.

### 07 Students directory
- Title "Student Directory & Attendance Overview" + "Academic Year 2025–2026" chip.
- KPI cards: Enrolled, Good/Safe (≥ 75%), Warning (65–74%), Low/Critical (< 65%), each with a coloured icon.
- Toolbar: Class chips (All Classes, 3C2, 3C1, 4C1, 2C3), search, sort select.
- Table: avatar + name + email, roll-number chip (monospace), class chip, attendance bar + %, status pill (Good/Safe · Warning · Low/Critical), and **View Details**. Paginated, 8 per page.
- **Detail modal** (`07b`): the student's profile and attendance history.

### 08 Reports
- Header with icon tile; KPI strip (Lectures Held, Labs Held, Total Batches).
- **Batch selected** card: Subject + Batch selects; a big average-attendance number (88%) with a delta pill ("▲ +1% vs subject avg"), Labs Held, Best Week, Lowest Week; an "All classes average" toggle.
- **Attendance trend** line chart (W1–W8, burgundy line with a soft fill) + Export CSV.
- **Month calendar:** days that had sessions are tinted, today is outlined, plus a range label.
- **Lowest attendance** card with student tiles.

### 09 All recorded lectures
Back link, title, a full-width search, a toolbar (Sort by, Group by, Filter selects), and a table of course + section chip / time + room / attendance % / **View ›**.

### 10 Report details
Breadcrumb (Reports / Data Structures · 3C2), a class header card with an "All-Time Info" pill, four big-number KPI cards (Total Lectures, Average Attendance, Enrolled Students, Sessions Below 75%), and a **Lecture-wise Attendance** table (session, present x/50, bar + %, status pill).

### 11 Settings
Groups: **Attendance preferences** (requirement %, default lecture length, default department), **Appearance** (colour theme), **Account**. Each section carries a scope badge: "Saved in this browser" (green) or "Requires server" (sections not yet available). Save is disabled until something changes; there is a "Discard unsaved changes?" dialog.

### 12 Student-view preview
The teacher picks a demo student and sees the student portal as that student would. It currently uses the **student portal's own chrome**: no teacher sidebar, a "Student · Demo" tag and a "Teacher view" button.

---

## 6. Current visual system

**Brand:** deep burgundy on warm off-white. Light and dark themes are both first-class; the toggle sits in the top bar and in Settings.

**Typeface:** Inter 400/500/600/700 (Google Fonts) for everything. Monospace only for roll numbers (e.g. `3C2-043`).

**Sizes follow the root `DESIGN.md`** (structure only, not its colours):

| Token | Value |
|---|---|
| Page title | 28px / 700 / line-height 1.2 / −0.6px tracking (Dashboard greeting ≈ 40px) |
| Card / section title | 18–22px / 600–700 |
| Body | 14px; small text 12–13px; table headers 11px uppercase, +0.6px tracking |
| Spacing scale | 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| Radius | 8px controls · 12px cards · 14px modals · pill (9999px) for badges/chips |
| Control height | 40px toolbar controls (inputs, selects, chips, primary/secondary buttons) · 32px compact row actions |
| Header icon tile | 48px, 12px radius, tinted burgundy background |
| Shadows | very soft (`0 1px 2px` level on cards); larger only on modals and popovers |

**Colour tokens.** Teacher pages use `--cs-*` tokens (`frontend/src/styles/teacher.css`). Values marked † are the ones used on screen in practice.

| Role | Light | Dark |
|---|---|---|
| Brand fill (`--cs-crimson`) | `#7a1515` † | `#a83232` |
| Brand hover | `#651111` | `#bb3d3d` |
| Brand as text | `#7a1515` | `#f19a9a` |
| Brand tint (bg) | `rgba(122,21,21,.08)` | `rgba(241,154,154,.12)` |
| Page background | `#f5f3ef` | `#0f0e0d` |
| Card | `#ffffff` | `#1d1b19` |
| Card hover / table header | `#faf8f5` | `#262320` |
| Sidebar | `#fffdfb` | `#171513` |
| Border / subtle border | `#e2dcd3` / `#eee9e2` | `#3a3531` / `#2c2825` |
| Text primary / secondary / muted / faint | `#1f1b18` / `#4f4842` / `#6e6660` / `#9a928b` | `#f3efeb` / `#cbc3bb` / `#a69d95` / `#7d756e` |
| Success (present, good) | `#17703a` on `#e7f3ec` | `#5fd28b` on `#17301f` |
| Warning (unverified, 65–74%) | `#9a4a06` on `#fbf0e1` | `#f2b85b` on `#33260f` |
| Danger (critical, error) | `#b42318` on `#fdecea` | `#f59a92` on `#3a1a17` |
| Info (AI match) | `#1e4f9c` on `#e9f0fb` | `#8db4f2` on `#18243a` |
| Confirmed absent | `#565656` on `#efefef` | `#d0d0d0` on `#2c2c2c` |

**Status semantics (keep these):** present = green · unverified = amber · error/critical = red · confirmed absent = neutral grey. Status is **always shown as text plus colour**, never colour alone. The verification-method chips are AI Match (blue), NFC (purple) and Manual (grey).

**Contrast:** body and muted text ≥ 4.5:1; focus rings and borders ≥ 3:1. Focus ring is a 2px burgundy outline with a 2px offset.

**Motion:** short and functional (150–300ms, ease-out). Examples: the sidebar pill slide, the tab transition, attendance bars growing once on first view. Everything is turned off under `prefers-reduced-motion`.

---

## 7. Known inconsistencies (please resolve in the design)

1. **Two colour-token sets.** The newer screens (Dashboard, Classes, Schedule, Reports) use `--db-*` tokens with cooler slate text (`#0f172a` ink, `#64748b` muted, brand `#7b1113`). The older screens use the warmer `--cs-*` set above. Text greys and borders differ slightly between pages as a result. **Pick one set.**
2. **Page headers come in three styles.** Most pages: icon tile + title + subtitle. Attendance pages: back link + chips + title on a white band with a bottom border. Dashboard: large greeting with no icon. Students: title with no icon tile.
3. **Content width.** The full unverified/verified lists use a centred narrow column; every other page is full width.
4. **The student preview (12) leaves the teacher frame entirely.** There's no sidebar or top bar, so it's unclear how to get back. It should probably sit inside the teacher shell with a clear "Previewing as …" banner.
5. **KPI cards vary.** Icon left + label/number (Classes, Students), icon top + big number (Report details), or a joined strip (Reports). Card heights differ (72–78px).
6. **Classes year chips wrap to two lines on phones** ("All Years", "PG (1 MCA)").
7. **Table row actions vary:** "Resolve" (amber outline), "View Details" (eye icon), "View ›", "View as student ›".
8. **Copy tone is uneven.** Some lines are jargon-heavy ("Neural network instantly matches student face embeddings", "attendance history telemetry", "Biometric facial AI"). Teachers aren't ML people; plain language is better.

## 8. Constraints for the new design

- **Stack:** React 19 + React Router 7 + plain CSS (no Tailwind or component library). Icons come from **lucide-react**, so use Lucide icon names. Shared rules live in one stylesheet with CSS variables, so a design expressed as **tokens + component specs** maps directly onto the code.
- **Keep:** the burgundy brand, light + dark themes, the flat sidebar + in-page tabs pattern, the status colour semantics, Inter, and the 8px/12px radius and 40px/32px control scale (adjusting these is fine if done everywhere).
- **Responsive:** desktop first (1280–1440), must work at **390px** with no horizontal page scroll. Wide tables scroll inside their card.
- **Accessibility:** WCAG 2.1 AA contrast in both themes, visible focus, keyboard-reachable everything, text + colour for every status.
- **Data is mock today.** The backend API exists but most screens aren't wired to it yet, so the layouts need empty, loading and error states as well (e.g. "No lectures today", "No unverified students — all matched").

## 9. What would help most from the design pass

1. One coherent **page-header pattern** (with variants for: top-level page, detail page with back link + breadcrumb, live session).
2. One **KPI/stat card** component and one **table** pattern (row actions, status pill, pagination, empty state).
3. A tighter **Attendance session screen (04)**. It's the screen teachers use under time pressure: the unverified list, the one-tap Resolve flow, progress and Save should read at a glance.
4. A **Dashboard** that makes "start/continue the live lecture" the obvious first action.
5. Unified tokens (resolve item 7.1) with light + dark values.
6. Phone layouts for 01, 04 and 07.
