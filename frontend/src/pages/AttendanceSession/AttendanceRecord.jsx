// The attendance record for this class and day: who is present / absent, plus CSV downloads
// (this day, or every saved day as one sheet that opens in Excel).
import { useState } from "react";
import { Download } from "lucide-react";
import { listLogs } from "../../api/attendance";

const LABEL = { p: "Present", u: "To review", a: "Absent" };

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function download(name, lines) {
  // BOM so Excel reads the file as UTF-8.
  const blob = new Blob(["﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AttendanceRecord({ rows, date, classLabel, classroomId, saved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sorted = [...rows].sort((x, y) => x.roll.localeCompare(y.roll, undefined, { numeric: true }));
  const file = classLabel.replace(/[^\w-]+/g, "_");

  const today = () =>
    download(`attendance_${file}_${date}.csv`, [
      ["Roll number", "Name", "Status"],
      ...sorted.map((r) => [r.roll, r.name, r.st === "p" ? "Present" : "Absent"]),
    ]);

  const all = async () => {
    setBusy(true);
    setError("");
    try {
      const logs = (await listLogs(classroomId)).sort((x, y) => x.session.session_date.localeCompare(y.session.session_date));
      const dates = logs.map((l) => l.session.session_date);
      const status = logs.map((l) => new Map(l.records.map((r) => [r.student_id, r.status])));
      download(`attendance_${file}_all.csv`, [
        ["Roll number", "Name", ...dates, "Present", "Total"],
        ...sorted.map((r) => {
          const marks = status.map((m) => (m.has(r.id) ? (m.get(r.id) === "present" ? "P" : "A") : ""));
          return [r.roll, r.name, ...marks, marks.filter((x) => x === "P").length, marks.filter(Boolean).length];
        }),
      ]);
    } catch (err) {
      setError(err.message || "Could not download.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="as-card db-rise" aria-label="Attendance record" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h4 style={{ margin: 0 }}>Record · {date}</h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="as-b1" disabled={!saved} title={saved ? "" : "Save the record first"} onClick={today}>
            <Download size={14} aria-hidden="true" /> This day
          </button>
          <button type="button" className="as-b1" disabled={busy} onClick={all}>
            <Download size={14} aria-hidden="true" /> All days
          </button>
        </div>
      </div>
      {error && <p className="as-modal-note">{error}</p>}
      <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 14 }}>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--as-track, #ddd)" }}>
              <td style={{ padding: "6px 4px" }}>{r.name}</td>
              <td style={{ padding: "6px 4px", opacity: 0.7 }}>{r.roll}</td>
              <td style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600, color: r.st === "p" ? "var(--as-ok, #16a34a)" : r.st === "u" ? "var(--as-wa, #b45309)" : "var(--as-ne, #dc2626)" }}>
                {LABEL[r.st]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!saved && <p className="as-modal-note">Not saved yet. Statuses can still change.</p>}
    </section>
  );
}
