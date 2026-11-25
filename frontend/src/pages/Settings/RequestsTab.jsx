// src/pages/Settings/RequestsTab.jsx
// "Requests to admin": things only an administrator can change (enroll a face again, move a
// student to another batch, an NFC card that doesn't read, ...). The request stays on the admin
// dashboard until an admin marks it fixed; its status shows here.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, Send, Wrench, X } from "lucide-react";
import { REQUEST_KINDS, listMyRequests, requestKindLabel, sendRequest, withdrawRequest } from "../../api/requests";
import { SettingsCard } from "./settingsUi";

const HINTS = {
  face_reenroll: "Which student, and why (e.g. not recognised since a new haircut)?",
  batch_change: "Which student, from which batch to which?",
  degree_programme: "Which batch or subject, and the right degree programme?",
  nfc_card: "Which student, and what happens when the card is tapped?",
  subject_add: "Subject name, code, batch and how many lectures / labs a week.",
  schedule_change: "Which class, the current slot and the slot you want.",
  other: "Describe what needs changing.",
};

const when = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function StatusChip({ r }) {
  if (r.status === "fixed")
    return (
      <span className="ts-req-chip is-fixed">
        <CheckCircle2 size={13} aria-hidden="true" /> Fixed{r.resolved_at ? ` · ${when(r.resolved_at)}` : ""}
      </span>
    );
  if (r.status === "in_progress")
    return (
      <span className="ts-req-chip is-doing">
        <Wrench size={13} aria-hidden="true" /> {r.claimed_by_name || "An admin"} is on it
      </span>
    );
  return (
    <span className="ts-req-chip is-open">
      <Clock size={13} aria-hidden="true" /> Waiting for an admin
    </span>
  );
}

export function RequestsTab() {
  const [kind, setKind] = useState("face_reenroll");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const [mine, setMine] = useState({ loading: true, error: "", rows: [] });

  const load = useCallback(() => {
    listMyRequests()
      .then((rows) => setMine({ loading: false, error: "", rows }))
      .catch((err) => setMine((m) => ({ ...m, loading: false, error: err.message })));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // status changes when an admin starts or fixes it
    return () => clearInterval(t);
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!details.trim()) {
      setMsg({ type: "error", text: "Add a few words about what needs changing." });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const created = await sendRequest({ kind, subject: subject.trim(), details: details.trim() });
      setMine((m) => ({ ...m, rows: [created, ...m.rows] }));
      setSubject("");
      setDetails("");
      setMsg({ type: "ok", text: "Request sent. It stays with the admins until it's fixed." });
    } catch (err) {
      setMsg({ type: "error", text: err.status === 403 ? "Only teacher accounts can send requests." : err.message });
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (id) => {
    try {
      await withdrawRequest(id);
      setMine((m) => ({ ...m, rows: m.rows.filter((r) => r.id !== id) }));
    } catch (err) {
      setMsg({ type: "error", text: err.message });
      load();
    }
  };

  return (
    <>
      <SettingsCard
        title="Request a change"
        desc="Some changes can only be made by an administrator. Send a request and it stays on their dashboard until it's fixed."
      >
        <form className="ts-req-form" onSubmit={submit}>
          <fieldset className="ts-req-kinds">
            <legend className="ts-row-label">What do you need?</legend>
            {REQUEST_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                className={`ts-req-kind ${kind === k.value ? "on" : ""}`}
                aria-pressed={kind === k.value}
                onClick={() => setKind(k.value)}
              >
                {k.label}
              </button>
            ))}
          </fieldset>
          <label className="ts-req-field">
            <span className="ts-row-label">About (optional)</span>
            <input
              className="ts-input"
              value={subject}
              maxLength={160}
              placeholder="Student roll no., batch or subject, e.g. 102303456 or 3C21"
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="ts-req-field">
            <span className="ts-row-label">Details</span>
            <textarea
              className="ts-input ts-req-text"
              value={details}
              maxLength={2000}
              rows={4}
              placeholder={HINTS[kind]}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          {msg && <p className={`ts-req-msg ${msg.type === "ok" ? "is-ok" : "is-error"}`} role="status">{msg.text}</p>}
          <div className="ts-card-actions">
            <button type="submit" className="btn-modal-submit ts-req-send" disabled={sending}>
              {sending ? <Loader2 size={15} className="ts-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              Send to admin
            </button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard title="Your requests" desc="Newest first. You can withdraw a request until an admin starts on it.">
        {mine.loading ? (
          <p className="ts-empty">Loading…</p>
        ) : mine.error ? (
          <p className="ts-req-msg is-error">{mine.error}</p>
        ) : !mine.rows.length ? (
          <p className="ts-empty">You haven&apos;t sent any requests yet.</p>
        ) : (
          <ul className="ts-req-list">
            {mine.rows.map((r) => (
              <li key={r.id} className={`ts-req-item is-${r.status}`}>
                <div className="ts-req-top">
                  <strong>{requestKindLabel(r.kind)}</strong>
                  {r.subject && <span className="ts-req-about">{r.subject}</span>}
                  <StatusChip r={r} />
                </div>
                <p className="ts-req-details">{r.details}</p>
                <div className="ts-req-foot">
                  <span>Sent {when(r.created_at)}</span>
                  {r.status === "open" && (
                    <button type="button" className="ts-link" onClick={() => withdraw(r.id)}>
                      <X size={13} aria-hidden="true" /> Withdraw
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </>
  );
}
