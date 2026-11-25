// src/pages/Settings/settingsUi.jsx
// Building blocks for the teacher Settings tabs: cards, labelled rows and controls.
import { Lock } from "lucide-react";

// A titled card. `local`: settings saved in this browser; `server`: settings that need the
// ClassSight server (not connected) and are shown disabled. Neither: informational card.
export function SettingsCard({ title, desc, local = false, server = false, children, footer = null }) {
  return (
    <section className={`ts-card ${server ? "is-server" : ""}`}>
      <header className="ts-card-head">
        <div>
          <h3 className="ts-card-title">{title}</h3>
          {desc && <p className="ts-card-desc">{desc}</p>}
        </div>
        {server && <ServerBadge />}
        {local && <span className="ts-badge ts-badge-local">Saved in this browser</span>}
      </header>
      <div className="ts-card-body">{children}</div>
      {footer}
    </section>
  );
}

export function ServerBadge() {
  return (
    <span className="ts-badge ts-badge-server">
      <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
      Needs server
    </span>
  );
}

// One setting: label + short description on the left, control on the right (stacks on phones)
export function SettingRow({ id, label, desc, children, disabled = false }) {
  return (
    <div className={`ts-row ${disabled ? "is-disabled" : ""}`}>
      <div className="ts-row-text">
        <label className="ts-row-label" htmlFor={id} id={id ? `${id}-label` : undefined}>
          {label}
        </label>
        {desc && (
          <p className="ts-row-desc" id={id ? `${id}-desc` : undefined}>
            {desc}
          </p>
        )}
      </div>
      <div className="ts-row-control">{children}</div>
    </div>
  );
}

export function Toggle({ id, checked, onChange, disabled = false, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`ts-switch ${checked ? "on" : ""}`}
      onClick={() => onChange?.(!checked)}
    >
      <span className="ts-switch-knob" aria-hidden="true" />
    </button>
  );
}

// Radio group drawn as a segmented control. options: [{ value, label, Icon? }]
export function Segmented({ id, value, options, onChange, disabled = false, label }) {
  return (
    <div id={id} className="ts-seg" role="radiogroup" aria-label={label}>
      {options.map(({ value: v, label: text, Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          className={`ts-seg-opt ${value === v ? "on" : ""}`}
          onClick={() => onChange?.(v)}
        >
          {Icon && <Icon size={15} strokeWidth={2} aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  );
}

export function Select({ id, value, options, onChange, disabled = false }) {
  return (
    <select
      id={id}
      className="ts-input ts-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// Banner at the top of a tab whose settings can't be changed yet
export function ServerNote({ children }) {
  return (
    <div className="ts-note" role="note">
      <Lock size={16} strokeWidth={2} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function FieldError({ id, text }) {
  return (
    <p id={id} className="ts-error" role={text ? "alert" : undefined}>
      {text || ""}
    </p>
  );
}
