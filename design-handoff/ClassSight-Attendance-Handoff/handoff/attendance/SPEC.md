# ClassSight: Attendance session page handoff

**Source of truth:** `reference/ClassSight-Dashboard.html`. Open it and click **Attendance** in the sidebar; the view is `#va`.
- CSS: rules under `.cl #va`, `.atopg`, `.acols`/`.acol`, `#asess`, `.cq`, `.rtip`/`.sg`, `.lane2`, `.nrbar`, `.ac2`/`.rv2c`, `#ares`/`.ropts2`/`.ro2`/`.rlab`, `.aface`/`.fcr`/`.fci`/`.fcm`/`.fbar`/`.fcb`, `.anext`/`.anbody`/`.anlater`/`.ancd`. **Later rules override earlier ones** (the file grew by patching). Always use the **computed** style in the browser, not the first rule you find.
- JS: the block starting `// ---- attendance session ----` (`asReset`, `renderAS`, `aAnim`, `renderFace`, `renderRes`, `asSave`, the undo modal, `pickRes`), plus the IIFE that builds `.acols`.
- `reference/screenshots/` shows the target. Match it pixel-for-pixel, in light and dark mode.

All data is **mock**. Keep it in a typed module (`attendanceMock.ts`) so an API can replace it.

## Tokens (same as Dashboard, Students and Reports)
| Token | Light | Dark |
|---|---|---|
| `--mr` brand | `#7B1113` | `#9E3434` |
| `--mrt` brand text | `#7B1113` | `#E6A3A3` |
| `--bg` page | `#F5F5F4` | `#0F0E0D` |
| `--card` | `#FFFFFF` | `#1D1B19` |
| `--in` / `--in2` inner box | `#F8FAFC` / `#F4F6F8` | `#262320` / `#24211F` |
| `--bd` / `--bdi` borders | `#E0DDD9` / `#E5E9EE` | `#3A3531` / `#36312D` |
| `--tx` / `--mu` text | `#0F172A` / `#64748B` | `#F3EFEB` / `#A69D95` |
| `--track` ring/bar track | `#EEF0F2` | `#34302C` |
| Present `--ok` / `--okb` / `--okf` | `#17703A` / `#E7F3EC` / `#1F8A4C` | `#7FC49A` / `#1C2A21` / `#2E8B57` |
| Review `--wa` / `--wab` / `--waf` | `#9A4A06` / `#FBF0E1` / `#C76A12` | `#DDB06A` / `#2C2417` / `#B07A2E` |
| Absent / neutral `--fa` | slate grey | muted grey |

Dark mode is **muted, with no neon**. Cards have a 16px radius, a `--bd` border and a soft shadow. Inner boxes have a 12px radius. The font is Inter, 14px. Small labels are 11px, 700 weight, uppercase, with .06em tracking, in `--mu`.

## Data model
```ts
type Method = 'ai' | 'nfc' | 'man';          // face photo, NFC card, manual
type Row = { j: number; name: string; roll: string;
  st: 'p' | 'u' | 'a';                        // present, needs review, absent
  m: Method | null; why: string };            // why = reason the photo failed
type Session = { list: Row[]; focus: number | null; saved: boolean; savedAt?: string;
  u0: number;                                 // needs-review count at start (for progress bar)
  labOffset: number };                        // Recent labs window start
```
Mock: 30 students in batch 3C2C. About 7 start as `u`, with reasons from `AREASONS`. The rest are `p` with `m='ai'`. Next class: DBMS II, 2Q3B, UCS303P, 11:20–13:00, L207, 30 students, starts in 1h 40m. Later today: 13:50 Software Engineering 3C81B L105, then "No more classes".

## Layout (desktop, ≥ 1061px container width)
The page is one CSS grid, `.atopg`:
```
grid-template-columns: minmax(380px,1.15fr) 1fr 1fr;
grid-template-rows: auto minmax(0,1fr);
grid-template-areas: "hd hd c3" "c1 c2 c3";
gap: 16px 20px;
min-height: calc(100vh - 112px);   /* NOT a fixed height */
```
- **Columns 1 and 2 use `contain: size`.** They fill the row but never push it taller, and their lists scroll inside.
- **Column 3 sizes to its content** (Up next uses `min-height: max-content`). On a short screen the page grows and scrolls, and nothing spills out of a card. See screenshot 05.
- **Collapsing the sidebar** only widens the fluid columns. It must not leave gaps (01 vs 05).

### hd: header
- A 48px round back button (burgundy arrow, tinted background) → Dashboard.
- Next to it, the title **"Software Engineering"** (~30px, 700).
- Under the title, a row of small chips: `Lab`, `3C2C` (brand-tinted), `UCS503P`, a clock icon + `09:40 – 11:20`, a pin icon + `L105`, then the state pill (`In review` amber → `Ready to save` green → `Saved` green).

### c1, top: This session (`#asess`)
- **Header:** a camera icon tile, "This session", the subtitle "Live now · started 09:40", a `30 enrolled` chip and a `↺ Reset demo` link.
- **Ring:** 112px, stroke 8, track `--track`.
  - Three arcs in this order: present `--okf`, review `--waf`, absent `--fa`. Round caps, and a gap of stroke+3 between arcs.
  - The centre reads **`23`/30**, with "PRESENT" under it.
  - On load, the arcs draw in one after another with a 180ms stagger, and the number counts up over 900ms (ease-out cubic).
  - **Hovering the ring does nothing.**
- **Three square tiles** to the right of the ring: Present / Review / Absent.
  - Each has a coloured dot, a label and a big number. The tile has a tinted background.
  - **Hovering a tile replays that colour's arc animation** (0.7s). See screenshot 13.
- **Footer:** "Verified by" with method chips (camera n, NFC n, manual n).
  - **Save record** is a burgundy primary button.
  - After saving, the footer shows an **Edit** button and a disabled "✓ Saved HH:MM" button.

### c1, below: Needs review lane
- Amber top border. Title "Needs review", subtitle "The photo couldn't match them", and a count bubble.
- **Progress bar:** green, fills as students are resolved, labelled **"x of y resolved"**, where y = `u0`.
- **Rows:** avatar initials, name, and "roll · reason".
  - **Clicking** a row selects it (no hover selection, no arrows). The selected row gets a light amber background and border.
  - The list scrolls inside the card.
- **Empty state:** "Nothing left to review".

### c2, top: Resolve card (`#ares`)
- **Header:** avatar, name, "roll · 3C2C", and an overall attendance pill on the right (`100% · Good`, coloured by band).
- An amber reason bar with an alert icon.
- **A 2×2 grid of actions:** NFC card, Retake photo, Mark present, Keep absent.
  - **NFC card** and **Retake photo** show a spinner for 900ms ("Waiting for Kavya's card…" or "Matching the new photo…"), then mark the student present.
  - **Mark present** marks them present right away (method `man`).
  - **Keep absent** marks them absent.
  - **After any action**, focus moves to the first unresolved student, and a toast appears.
- **Recent labs:** 5 burgundy tick tiles, each with a date and time, plus ‹ › arrows to page through the history. The range ("21 Sept – 19 Oct") shows on the right.
- **Footer:** "Last attended 19 Oct" and "n left to review".
- **Empty state:** "All resolved", or "Record saved · Use Edit to make changes".

### c2, below: Absent lane
- Grey top border, then the title "Absent", the subtitle "Confirmed not in class" and a count.
- Each row has an **Undo** button. Undo opens a **confirmation modal** ("Undo absent for X?"), and confirming moves the student back to Needs review.
- **Empty state:** "No absentees".

### c3, top: Face check (`#aface`)
- **Header:** "Face check" and "Is this really Kavya?".
- **Two portrait boxes:** "Enrolled photo" and "From today's photo".
- **When the reason is "Not found in the photo":**
  - The second box is dashed and shows ⊘ "No face detected".
  - The note reads "The photo didn't pick up this student. Use NFC or Retake photo."
  - Both buttons are disabled.
- **Otherwise:** "Match NN% · needs 80% to auto-mark", with a bar and a marker at 80%.
- **It's them** marks the student present (`ai`). **Not them** sets the reason to "Face check: not this student".
- **No selection:** "No student selected".

### c3, below: Up next (`#anext`)
- **Header:** a clock icon, "Up next", "After this lab", and a `Lab` pill.
- **Inner box (`--in2`):** the title "Database Management System II" (16px, 700), the chips `2Q3B` (brand) and `UCS303P`, then rows with icons: time, room, students.
- **Later today:** shown only when the viewport is ≥ 1000px tall or in the 2-column layout. Rows show the time in brand colour, then the class and "batch · room". The final row is dashed: "15:40 No more classes".
- **"STARTS IN"** label, with **1h 40m** (26px, 700) on the right, pushed to the bottom (`margin-top: auto`).
- **Start attendance early:** a full-width outline button. It shows the toast "Next lab (2Q3B) can be started after you save this one".

## Save flow
1. **Save record** opens a modal: "Save attendance for 3C2C?", with three summary boxes (Present / Absent / Enrolled).
2. If anyone is still unreviewed, it adds the warning "n students are still unreviewed and will be saved as absent."
3. The buttons are **Keep reviewing** and **Save record**.
4. **Confirming:**
   - Every `u` becomes `a`, and the state becomes `Saved`.
   - The actions are disabled.
   - The toast "Attendance saved for 3C2C" appears.
5. **Edit** unlocks the record (toast "Record unlocked for editing").

## Responsive (container queries on `#va`, `container: av / inline-size`)
- **≤ 1060px:** `"hd hd" "c1 c2" "c3 c3"`.
  - Face check and Up next sit side by side in a full-width row.
  - The lanes take natural height (min 320px), and `contain: size` is off.
  - The page scrolls. See screenshot 06.
- **≤ 700px:** a single column, `hd, c1, c2, c3`. See screenshot 07.
- There is never horizontal scroll.

## Accessibility
- The ring has `role="img"` with an aria-label (e.g. "23 of 30 present, 7 to review, 0 absent").
- Review rows have `role="button"` and `tabindex="0"`, and Enter or Space selects them.
- The progress bar has `role="progressbar"` with `aria-valuenow` and `aria-valuemax`.
- Modals trap focus and close on Esc.
- Honour `prefers-reduced-motion`: no arc animation, no count-up, and no spinner delay.

## Screenshots
| File | Shows |
|---|---|
| 01 / 02 | 1920×1053 light / dark |
| 03 / 04 | 1440×900 light / dark |
| 05 | 1536×750, sidebar collapsed: the page grows, and nothing spills out of a card |
| 06 | 1200: two-column layout |
| 07 | 390: mobile |
| 08 | Another student selected |
| 09 | After Keep absent: progress bar, Absent lane, toast |
| 10 | Undo confirmation modal |
| 11 | Save modal |
| 12 | Saved state |
| 13 | Hovering the Review tile replays the amber arc |
