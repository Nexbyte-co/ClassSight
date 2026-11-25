// Admin: link a student's NFC ID card. On a phone with NFC (Chrome on Android) the card is tapped;
// anywhere else the serial number can be typed in (read it with an app such as NFC Tools).
import { useEffect, useRef, useState } from "react";
import { Nfc, Unlink } from "lucide-react";
import { getSectionStudent, linkStudentNfc, unlinkStudentNfc } from "../../api/sections";
import { formatUid, nfcSupported, startNfcScan } from "../../lib/webNfc";

export default function NfcCardLink({ student, onChanged }) {
  const [linked, setLinked] = useState(student.nfc_linked);
  const [uid, setUid] = useState(null); // the linked card's number, once loaded
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: "error" | "ok", text }
  const stopRef = useRef(null);

  useEffect(() => {
    setLinked(student.nfc_linked);
    if (!student.nfc_linked) {
      setUid(null);
      return undefined;
    }
    let live = true;
    getSectionStudent(student.section_id, student.id)
      .then((p) => live && setUid(p.nfc_uid))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [student.id, student.section_id, student.nfc_linked]);

  const stopScan = () => {
    stopRef.current?.();
    stopRef.current = null;
    setScanning(false);
  };
  useEffect(() => stopScan, []);

  const save = async (raw) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await linkStudentNfc(student.section_id, student.id, raw);
      setUid(res.nfc_uid);
      setLinked(true);
      setEditing(false);
      setValue("");
      setMsg({ kind: "ok", text: "Card linked." });
      onChanged?.();
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not link the card." });
    } finally {
      setBusy(false);
    }
  };

  const scan = async () => {
    setMsg(null);
    try {
      stopRef.current = await startNfcScan({
        onCard: (read) => {
          stopScan();
          setValue(formatUid(read));
          save(read);
        },
        onError: (text) => setMsg({ kind: "error", text }),
      });
      setScanning(true);
    } catch (err) {
      setMsg({ kind: "error", text: err.message });
    }
  };

  const unlink = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await unlinkStudentNfc(student.section_id, student.id);
      setUid(null);
      setLinked(false);
      setMsg({ kind: "ok", text: "Card unlinked." });
      onChanged?.();
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not unlink the card." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-nfc">
      <div className="adm-nfc-row">
        <span className={`adm-chip ${linked ? "adm-chip-good" : ""}`}>
          <Nfc size={13} aria-hidden="true" /> {linked ? (uid ? formatUid(uid) : "Linked") : "Not linked"}
        </span>
        {!editing && (
          <span className="adm-nfc-acts">
            <button type="button" className="adm-linkbtn" onClick={() => { setEditing(true); setMsg(null); }} disabled={busy}>
              {linked ? "Replace" : "Link card"}
            </button>
            {linked && (
              <button type="button" className="adm-linkbtn" onClick={unlink} disabled={busy}>
                <Unlink size={12} aria-hidden="true" /> Unlink
              </button>
            )}
          </span>
        )}
      </div>
      {editing && (
        <form
          className="adm-nfc-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) save(value.trim());
          }}
        >
          {nfcSupported() && (
            <button type="button" className="db-btn adm-primary" onClick={scanning ? stopScan : scan} disabled={busy}>
              <Nfc size={14} aria-hidden="true" /> {scanning ? "Waiting for the card… (stop)" : "Tap card on this phone"}
            </button>
          )}
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Serial number, e.g. 04:A2:3B:1C:5D:80"
            aria-label="Card serial number"
            disabled={busy}
            autoComplete="off"
          />
          <span className="adm-nfc-acts">
            <button type="submit" className="db-btn adm-primary" disabled={busy || !value.trim()}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="db-btn" onClick={() => { stopScan(); setEditing(false); setMsg(null); }} disabled={busy}>Cancel</button>
          </span>
        </form>
      )}
      {msg && <small className={`adm-nfc-msg ${msg.kind}`}>{msg.text}</small>}
    </div>
  );
}
