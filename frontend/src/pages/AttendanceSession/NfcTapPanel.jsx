// src/pages/AttendanceSession/NfcTapPanel.jsx — "NFC Library Card" mode: the teacher's phone reads each
// student's ID card (Web NFC, Chrome on Android) and the student is marked present. The mark is saved with
// the rest of the record, like any other.
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Nfc, Smartphone, Square } from "lucide-react";
import { nfcTap } from "../../api/attendance";
import { formatUid, nfcSupported, startNfcScan } from "../../lib/webNfc";

const MAX_LOG = 6;

export default function NfcTapPanel({ classroomId, rows, saved, locked, onPresent }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]); // newest first: { id, tone: "ok" | "info" | "er", text }
  const stopRef = useRef(null);
  // The card listener lives across renders, so it reads the latest roster and callback through refs.
  const rowsRef = useRef(rows);
  const presentRef = useRef(onPresent);
  useEffect(() => {
    rowsRef.current = rows;
    presentRef.current = onPresent;
  });
  const seq = useRef(0);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setOn(false);
  };
  // Stop listening when the panel closes, the class changes, or the record is saved / locked.
  useEffect(() => stop, [classroomId]);
  useEffect(() => {
    if (saved || locked) stop();
  }, [saved, locked]);

  const add = (tone, text) => setLog((l) => [{ id: ++seq.current, tone, text }, ...l].slice(0, MAX_LOG));

  const onCard = async (uid) => {
    try {
      const hit = await nfcTap(classroomId, uid);
      const row = rowsRef.current.find((r) => r.j === hit.student_id);
      if (!row) add("er", `${hit.name} isn't on today's roster.`);
      else if (row.st === "p") add("info", `${row.name} is already present.`);
      else {
        presentRef.current(row);
        add("ok", `${row.name} · ${row.roll} marked present`);
      }
      navigator.vibrate?.(60);
    } catch (err) {
      add("er", err.status === 404 ? `Card ${formatUid(uid)} isn't linked to a student. Ask an admin to link it.` : err.message || "Couldn't check that card.");
      navigator.vibrate?.([40, 60, 40]);
    }
  };

  const start = async () => {
    setError("");
    try {
      stopRef.current = await startNfcScan({ onCard, onError: (text) => add("er", text) });
      setOn(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!nfcSupported()) {
    return (
      <div className="as-nfc" role="status">
        <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          <b>Open this page on your phone.</b> Card tapping works in Chrome on an Android phone with NFC turned on. Use AI Photo Scan or
          mark students in Resolve here.
        </span>
      </div>
    );
  }

  return (
    <div className="as-nfcp">
      {saved ? (
        <p className="as-nfcp-hint">This record is saved. Choose Edit to tap more cards.</p>
      ) : on ? (
        <div className="as-nfcp-live" role="status">
          <span className="as-nfcp-pulse" aria-hidden="true"><Nfc size={18} strokeWidth={2} /></span>
          <span><b>Ready for cards</b><small>Students tap their ID card on the back of this phone.</small></span>
          <button type="button" className="as-b1" onClick={stop}><Square size={13} aria-hidden="true" />Stop</button>
        </div>
      ) : (
        <button type="button" className="as-pbtn as-nfcp-start" onClick={start} disabled={locked}>
          <Nfc size={16} strokeWidth={2} aria-hidden="true" />Start tapping cards
        </button>
      )}
      {error && (
        <div className="as-fcm ne">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {log.length > 0 && (
        <ul className="as-nfcp-log" aria-live="polite" aria-label="Cards tapped">
          {log.map((e) => (
            <li key={e.id} className={e.tone}>
              {e.tone === "ok" ? <CircleCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />}
              <span>{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
