// src/pages/AttendanceSession/LaneWindow.jsx — one lane (Present, Absent or Needs review) in a large window,
// with a search box. Present and Absent can be undone one by one or all at once (asked once first).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, CircleMinus, RotateCcw, Search, X } from "lucide-react";
import { initials } from "../../utils/initials";

const KINDS = {
  p: { title: "Present", sub: "Recognised or confirmed", Icon: CircleCheck, tone: "lok" },
  a: { title: "Absent", sub: "Confirmed not in class", Icon: CircleMinus, tone: "lne" },
  u: { title: "Needs review", sub: "The photo couldn't match them", Icon: CircleAlert, tone: "lwa" },
};
const HOW = { ai: "Face match", nfc: "NFC card", man: "Marked by you" };

export default function LaneWindow({ kind, rows, saved, locked, onUndo, onUndoAll, onSelect, onClose }) {
  const { title, sub, Icon, tone } = KINDS[kind];
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const canUndo = kind !== "u"; // after saving, an undo reopens the record for editing first

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && (confirming ? setConfirming(false) : onClose());
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming, onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.roll.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const detail = (r) => {
    if (kind === "p") return `${HOW[r.m] || "Present"}${r.m === "ai" && r.confidence != null ? ` ${Math.round(r.confidence * 100)}%` : ""}`;
    if (kind === "u") return r.why;
    return "Absent";
  };

  return createPortal(
    <div className="as-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`as-modal-box as-lanewin ${tone}`} role="dialog" aria-modal="true" aria-labelledby="as-lanewin-title">
        <header className="as-lanewin-hd">
          <span className="li"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
          <div>
            <h2 id="as-lanewin-title">{title} <span className="lc">{rows.length}</span></h2>
            <p>{sub}</p>
          </div>
          <button className="as-modal-close" type="button" aria-label="Close" onClick={onClose}><X size={17} /></button>
        </header>
        <label className="as-lanewin-search">
          <Search size={15} aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll number" aria-label={`Search ${title}`} />
        </label>
        <div className="as-lanewin-grid">
          {shown.map((r) => (
            <div
              key={r.j}
              className={`as-lanewin-card ${kind === "u" ? "click" : ""}`}
              role={kind === "u" ? "button" : undefined}
              tabIndex={kind === "u" ? 0 : undefined}
              onClick={kind === "u" ? () => onSelect(r.j) : undefined}
              onKeyDown={kind === "u" ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(r.j)) : undefined}
            >
              <span className="as-av lg" aria-hidden="true">{initials(r.name)}</span>
              <span className="as-stn">
                <b>{r.name}</b>
                <i>{r.roll} · {detail(r)}</i>
              </span>
              {canUndo && (
                <button type="button" className="as-undo" disabled={locked} onClick={() => onUndo(r.j)}>Undo</button>
              )}
            </div>
          ))}
          {!shown.length && <p className="as-lanewin-empty">{rows.length ? "No one matches that search." : `Nobody in ${title} yet.`}</p>}
        </div>
        {canUndo && rows.length > 0 && (
          <footer className="as-lanewin-ft">
            {confirming ? (
              <>
                <span className="as-lanewin-q">Move all {rows.length} back to Needs review?{saved ? " The saved record will reopen for editing." : ""}</span>
                <button type="button" className="as-b1" onClick={() => setConfirming(false)}>Cancel</button>
                <button type="button" className="as-pbtn" disabled={locked} onClick={() => { onUndoAll(rows.map((r) => r.j)); setConfirming(false); }}>
                  <RotateCcw size={15} aria-hidden="true" /> Yes, undo all
                </button>
              </>
            ) : (
              <button type="button" className="as-b1" disabled={locked} onClick={() => setConfirming(true)}>
                <RotateCcw size={15} aria-hidden="true" /> Undo all
              </button>
            )}
          </footer>
        )}
      </section>
    </div>,
    document.querySelector(".attendance-session-shell") || document.body
  );
}
