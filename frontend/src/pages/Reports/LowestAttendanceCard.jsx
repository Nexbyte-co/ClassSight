import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "./icons";
import StudentTile from "./StudentTile";
import { BATCHES, formatRange } from "./reportsMock";

const TILE_GAP = 12;

// Students under 75% for the selected batch (or all batches). The list scrolls by whole rows
// with the chevrons on the right instead of a scrollbar; View more opens the full list in a window.
function LowestAttendanceCard({ batchIndex, allMode, from, to, students, query, onQueryChange, onExport, onViewMore }) {
  const listRef = useRef(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const batch = BATCHES[batchIndex];

  const updateNav = useCallback(() => {
    const l = listRef.current;
    if (!l) return;
    setCanUp(l.scrollTop > 1);
    setCanDown(l.scrollTop + l.clientHeight < l.scrollHeight - 1);
  }, []);

  useEffect(() => {
    const l = listRef.current;
    if (!l) return undefined;
    const ro = new ResizeObserver(updateNav);
    ro.observe(l);
    l.addEventListener("scroll", updateNav);
    return () => {
      ro.disconnect();
      l.removeEventListener("scroll", updateNav);
    };
  }, [updateNav]);

  useEffect(() => {
    const id = requestAnimationFrame(updateNav);
    return () => cancelAnimationFrame(id);
  }, [students, updateNav]);

  // Scroll by however many whole rows are visible
  const scrollRows = (dir) => {
    const l = listRef.current;
    const tile = l?.querySelector(".rp-stile");
    if (!tile) return;
    const pitch = tile.offsetHeight + TILE_GAP;
    const visible = Math.max(1, Math.floor((l.clientHeight + TILE_GAP) / pitch));
    const top = Math.round(l.scrollTop / pitch + dir * visible) * pitch;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    l.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  };

  const handleQuery = (value) => {
    if (listRef.current) listRef.current.scrollTop = 0;
    onQueryChange(value);
  };

  const q = query.trim();

  return (
    <section className="rp-card rp-low" aria-label="Lowest attendance students">
      <aside className="rp-lside">
        <h4 className="rp-ltt">Lowest attendance students</h4>
        <div className="rp-lmeta">
          {allMode ? (
            <>
              <b>All batches</b>
              <span>All subjects</span>
            </>
          ) : (
            <>
              <b>{batch.group} · {batch.type}</b>
              <span>{batch.name}</span>
            </>
          )}
          <span>{formatRange(from, to)}</span>
        </div>
        <div className="rp-lfoot">
          <span className="rp-lcnt">{students.length} {students.length === 1 ? "student" : "students"}</span>
          <button type="button" className="rp-exp sm" title="Export this list as CSV" onClick={onExport}>
            <Icon name="download" size={14} />
            Export
          </button>
        </div>
      </aside>

      <div className="rp-lright">
        <div className="rp-lbar">
          <label className="rp-lsr">
            <Icon name="search" size={15} />
            <input
              type="search"
              placeholder="Search name or roll number"
              autoComplete="off"
              aria-label="Search students by name or roll number"
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
            />
          </label>
          <button type="button" className="rp-exp rp-lmore" onClick={onViewMore}>
            View more
            <Icon name="expand" size={13} />
          </button>
        </div>
        <div className="rp-lbody">
          <div className="rp-lscr" ref={listRef}>
            {students.length ? (
              students.map((s) => <StudentTile key={s.roll} student={s} showBatch={allMode} />)
            ) : (
              <div className="rp-lempty">
                {q ? `No student matches "${q}".` : "No students with low attendance in this period."}
              </div>
            )}
          </div>
          <div className="rp-lcol">
            <button type="button" className="rp-lnav" aria-label="Show previous students" disabled={!canUp} onClick={() => scrollRows(-1)}>
              <Icon name="up" size={16} strokeWidth={2.4} />
            </button>
            <button type="button" className="rp-lnav" aria-label="Show more students" disabled={!canDown} onClick={() => scrollRows(1)}>
              <Icon name="down" size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LowestAttendanceCard;
