// src/pages/AttendanceSession/SessionActions.jsx — Cancel / Edit details / Save record for the session,
// in one card under the student being reviewed.
import { Check, Pencil, Save, X } from "lucide-react";

export default function SessionActions({ saved, savedAt, saving, locked, hint, onCancel, onEdit, onSave }) {
  return (
    <section className="as-card as-actions db-rise" aria-label="Session actions">
      <button type="button" className="as-b1" onClick={onCancel}>
        <X size={15} strokeWidth={2.2} aria-hidden="true" />
        Cancel
      </button>
      <button type="button" className="as-b1" disabled={!saved || locked} title={saved ? "Reopen the saved record to correct it" : "Not saved yet, so you can change anything directly"} onClick={onEdit}>
        <Pencil size={14} strokeWidth={2} aria-hidden="true" />
        {saved ? "Edit details" : "Editing"}
      </button>
      {saved ? (
        <button type="button" className="as-pbtn" disabled title={`Saved ${savedAt}`}>
          <Check size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Saved {savedAt}</span>
        </button>
      ) : (
        <button type="button" className="as-pbtn" title={hint} disabled={locked || saving} onClick={onSave}>
          <Save size={15} strokeWidth={2} aria-hidden="true" />
          <span>{saving ? "Saving…" : "Save record"}</span>
        </button>
      )}
    </section>
  );
}
