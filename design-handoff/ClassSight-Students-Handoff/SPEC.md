# ClassSight: Students page handoff

**Source of truth:** `reference/ClassSight-Dashboard.html`. Open it and click **Students** in the sidebar; the view is `#vt`.
- The page's CSS rules are prefixed `.cl #vt`, `.bdeck`, `.sdeck`, `.lane2`, `.sc2`, `.dq`, `.dtip`, `.vah` and `.vgrid`.
- The JS is the block starting `// ---- students page (batch deck + selected student + status lanes) ----`.
- `reference/screenshots/` shows the target. Match it pixel-for-pixel, in light and dark mode.

All data is **mock**. Keep it in a typed module, and the API can replace it later.

## Tokens (same as Dashboard and Reports)
| Token | Light | Dark |
|---|---|---|
| `--mr` brand | `#7B1113` | `#9E3434` |
| `--mrt` brand text | `#7B1113` | `#E6A3A3` |
| `--bg` page | `#F5F5F4` | `#0F0E0D` |
| `--card` | `#FFFFFF` | `#1D1B19` |
| `--in` / `--in2` inner card | `#F8FAFC` / `#F4F6F8` | `#262320` / `#24211F` |
| `--bd` / `--bd2` / `--bdi` borders | `#E0DDD9` / `#EEECE9` / `#E5E9EE` | `#3A3531` / `#2C2825` / `#36312D` |
| `--tx` / `--mu` text | `#0F172A` / `#64748B` | `#F3EFEB` / `#A69D95` |
| `--track` ring/bar track | `#EEF0F2` | `#34302C` |
| Good `--ok` / `--okb` / `--okf` | `#17703A` / `#E7F3EC` / `#1F8A4C` | `#7FC49A` / `#1C2A21` / `#2E8B57` |
| Warning `--wa` / `--wab` / `--waf` | `#9A4A06` / `#FBF0E1` / `#C76A12` | `#DDB06A` / `#2C2417` / `#B07A2E` |
| Critical `--er` / `--erb` / `--erf` | `#B42318` / `#FDECEA` / `#C2352A` | `#E59A92` / `#2D1D1B` / `#B04A42` |

Dark mode is **muted on purpose, with no neon**. Cards have a 16px radius, a `--bd` border and a `0 1px 3px rgba(15,23,42,.08)` shadow. Inner boxes have a 12px radius. The font is Inter, 14px. Small labels are 11px, 700 weight, uppercase, with .06em tracking, in `--mu`.

## Status bands (driven by the Settings threshold `THR`, default 75)
- **Good:** ≥ THR.
- **Warning:** THR−10 to THR−1.
- **Critical:** below THR−10.

Always show the text label as well as the colour.

## Layout (desktop)
`#vt` is a flex column with height `calc(100vh − 112px)` and **no page scroll** at ≥ 900px tall. From top to bottom:

1. **Page header:** a 48px icon tile, "Students" and a subtitle, with **Export CSV** on the right. Export covers the current scope.
2. **Two decks side by side** (`1.25fr | 1fr`, 20px gap). They stack to one column below 1180px.
   - **Batch deck (`.bdeck`):**
     - **Left:**
       - A 128px average ring labelled "AVG".
       - A "▲/▼ n% vs subject" pill (batch mode only).
       - A line of "30 students · Mon 09:40", or "240 students · 8 batches" in All mode.
     - **Right:**
       - **Subject** select (All subjects + each subject).
       - **Batch** select (All batches + batches of the chosen subject).
       - **All students** button: sets both selects to All and turns burgundy when active.
       - A 10px mix bar (Critical | Warning | Good, flex by count, 3px gaps).
       - Three count boxes, tinted, with a 1px tinted border.
       - **Bottom row:**
         - Batch mode: "Last lab · date · n present · n absent · Open record ›", which opens the report details for that batch.
         - All mode: "Weakest batch · name · avg% · Show batch ›", which selects that batch.
     - Changing the subject picks its only batch if it has one, otherwise "All batches". Choosing a batch also sets its subject.
   - **Selected student deck (`.sdeck`):**
     - **Identity box** (`--in2`): a 64px ring, name, "roll · batch", a status pill ("Critical · 3 of 8 labs") and "Last attended 12 Oct". There's **no** Student view button.
     - **Attendance by day:** shows the date range of the visible window, with ‹ › arrows (disabled at the ends) that page through **6 days** at a time. Each cell is the weekday (uppercase), a 30px square and the date. The latest day is tinted.
       - **1 class that day:** a filled burgundy tick if present, a pale red cross if absent.
       - **2+ classes that day:** the square fills burgundy from the bottom by **minutes attended ÷ minutes held** (lecture = 50, lab = 100). A dark badge shows the class count. Hover or focus shows a tooltip listing each class (type, time, minutes, Present/Absent) and "Attended X of Y min · Z%".
     - **Note:** in the band colour. It lists the dates missed and how many labs in a row they need to reach Good or THR: `ceil((T·held − attended)/(1−T))`.
3. **Status lanes:** three cards (Critical, Warning, Good) at the bottom.
   - **Header:** an icon tile, a title, the range, and a count pill, with a 3px top stripe in the band colour.
   - **List:** on an `--in` background, students are sorted lowest % first. **5 cards visible** (56px each, 6px gap); the list scrolls inside, with a thin hover-only scrollbar.
   - **Card:** avatar initials, name, "roll · batch", and a 40px ring.
   - **Selection:** clicking a card selects it, giving it a band-coloured border plus a 3px soft ring, and loads it into the student deck.
   - **Footer:** "Showing 5 of N" and a **View all ⤢** button (disabled when the lane is empty).
   - **Empty lane:** shows "No students here".
4. **View all window** (a modal, not a new page, about 1000×700). It has **no search or batch filter**, because the page's filters apply.
   - **Header:** tinted in the band colour, with an icon, "Critical · N students", the context line (subject · batch · range · term dates), Export CSV and a close button.
   - **Toolbar:** a status switch (Critical / Warning / Good with counts) and a Sort select (Lowest first, Highest first, Name A–Z, Roll number).
   - **Table:** Student, Batch, Labs, Attendance bar + %, Last seen, and "To reach 75%" ("Next n labs in a row", or "On track").
   - **Behaviour:** clicking a row selects that student on the page and closes the window. Esc and the backdrop close it, focus is trapped inside, and focus returns to the trigger on close.

**Default selection:** the batch of the current or most recent lab (3C2C in the mock), with the first Critical student selected.

## Responsive
- **≤ 1180px:** decks stack; the page scrolls; lanes keep a 326px list.
- **≤ 900px:** lanes stack into one column.
- **≤ 700px:**
  - The batch deck stacks (ring centred).
  - Selects go full width.
  - The day strip shows 4 days.
  - The modal table scrolls sideways inside the window.
  - **No horizontal page scroll at 390px.**

## Data model (mock → API)
- `SLOTS[]`: `{code, name, group, gid, venue, day, start, dur, type, ci}` (one per batch).
- `CLASSES[]`: subjects.
- `STU[slot][j]`: `{name, roll, pres[8]}`.
- `ROSTER`: flattened, with `key, a (attended), h (held), pct, last`.
- `SES[key][w]`: a list of sessions on that day, `{t:'Lab'|'Lec', tm, mn, ok}`. (The mock adds an extra lecture on weeks 3 and 6 to show multi-class days.)

Suggested endpoints:
- `GET /students?subject&batch`
- `GET /students/:id/sessions?from&to`
- `GET /batches/:id/last-session`

## Acceptance checklist
- [ ] Matches screenshots 01–07.
- [ ] No page scroll at 1440×900 and 1920×1053. No horizontal scroll at 390px.
- [ ] Subject and Batch selects, All students and Show batch all update the decks and lanes.
- [ ] Clicking a lane card updates the student deck. The day strip pages correctly, and multi-class days fill by minutes and show the tooltip.
- [ ] View all: the status switch, sort and row click work; Esc and the backdrop close it.
- [ ] Changing the threshold in Settings changes the bands everywhere.
- [ ] Light and dark modes match tokens; keyboard focus is visible everywhere.
