// src/pages/Settings/AccountSecurity.jsx
// Security cards shared by the teacher and student Settings: change password, and recent sign-ins
// with "Sign out of other devices". `student` picks the /student/... endpoints.
import { useCallback, useEffect, useState } from "react";
import { Laptop, Loader2, Smartphone } from "lucide-react";
import { changePassword, listMyLogins, signOutOtherDevices } from "../../api/account";
import { SettingsCard } from "./settingsUi";

const MIN_LENGTH = 8;

// "Chrome on Windows" from a user-agent string (best effort; unknown parts are left out).
function deviceLabel(ua = "") {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" on ") || "Unknown device";
}
const isMobile = (ua = "") => /Android|iPhone|iPad|Mobile/.test(ua);
const when = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PasswordCard({ student = false }) {
  const [fields, setFields] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    setMsg(null);
  };

  const problem =
    fields.next && fields.next.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters.`
      : fields.confirm && fields.confirm !== fields.next
        ? "The two new passwords don't match."
        : "";
  const ready = fields.current && fields.next.length >= MIN_LENGTH && fields.confirm === fields.next;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setMsg(null);
    try {
      await changePassword({ student, currentPassword: fields.current, newPassword: fields.next });
      setFields({ current: "", next: "", confirm: "" });
      setMsg({ ok: true, text: "Password changed. Your other devices were signed out." });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not change the password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Change password" desc={`Use at least ${MIN_LENGTH} characters. Other devices are signed out.`}>
      <form onSubmit={submit}>
        <div className="ts-pw-grid">
          {[
            ["current", "Current password", "current-password"],
            ["next", "New password", "new-password"],
            ["confirm", "Confirm new password", "new-password"],
          ].map(([key, label, ac]) => (
            <div key={key}>
              <label htmlFor={`pw-${key}`} className="ts-row-label">
                {label}
              </label>
              <input
                id={`pw-${key}`}
                className="ts-input"
                type="password"
                autoComplete={ac}
                value={fields[key]}
                onChange={set(key)}
                aria-invalid={key !== "current" && Boolean(problem) && Boolean(fields[key])}
              />
            </div>
          ))}
        </div>
        <div className="ts-card-actions ts-pw-actions">
          <p className={`ts-req-msg ${msg ? (msg.ok ? "is-ok" : "is-error") : problem ? "is-error" : ""}`} role="status">
            {msg?.text || problem}
          </p>
          <button type="submit" className="btn-modal-submit ts-req-send" disabled={!ready || busy}>
            {busy && <Loader2 size={15} className="ts-spin" aria-hidden="true" />}
            Update password
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

export function SignInsCard({ student = false }) {
  const [state, setState] = useState({ loading: true, error: "", rows: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(
    () =>
      listMyLogins({ student })
        .then((rows) => setState({ loading: false, error: "", rows }))
        .catch((err) => setState({ loading: false, error: err.message, rows: [] })),
    [student]
  );
  useEffect(() => {
    load();
  }, [load]);

  const signOutOthers = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await signOutOtherDevices({ student });
      setMsg({ ok: true, text: "Every other device is signed out. This one stays signed in." });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Could not sign out other devices." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Recent sign-ins" desc="Your account over the last 30 days">
      {state.loading ? (
        <p className="ts-empty">Loading…</p>
      ) : state.error ? (
        <p className="ts-req-msg is-error">{state.error}</p>
      ) : !state.rows.length ? (
        <p className="ts-empty">No sign-ins in the last 30 days.</p>
      ) : (
        <ul className="ts-logins">
          {state.rows.map((r, i) => {
            const Icon = isMobile(r.user_agent) ? Smartphone : Laptop;
            return (
              <li key={r.id}>
                <Icon size={16} aria-hidden="true" />
                <span className="ts-logins-dev">
                  {deviceLabel(r.user_agent)}
                  {i === 0 && <em>Latest</em>}
                </span>
                <span className="ts-logins-ip">{r.ip}</span>
                <time dateTime={r.created_at}>{when(r.created_at)}</time>
              </li>
            );
          })}
        </ul>
      )}
      <div className="ts-card-actions ts-pw-actions">
        <p className={`ts-req-msg ${msg ? (msg.ok ? "is-ok" : "is-error") : ""}`} role="status">
          {msg?.text}
        </p>
        <button type="button" className="btn-modal-cancel" onClick={signOutOthers} disabled={busy}>
          Sign out of other devices
        </button>
      </div>
    </SettingsCard>
  );
}
