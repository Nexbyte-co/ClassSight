// Lecture / Lab / Tutorial: which kinds of session a subject has. Used by the add-subject form,
// the subject page and the subjects list.
import { BookOpen, FlaskConical, Users } from "lucide-react";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export const MAX_PER_WEEK = 20;

export const SESSION_TYPES = [
  { key: "lecture", field: "lecture_count", label: "Lecture", Icon: BookOpen },
  { key: "lab", field: "lab_count", label: "Lab", Icon: FlaskConical },
  { key: "tutorial", field: "tutorial_count", label: "Tutorial", Icon: Users },
];

// {lecture, lab, tutorial} counts per week from one class, or the largest over several classes of a subject.
export const typesOf = (classes) => {
  const list = Array.isArray(classes) ? classes : [classes];
  const out = { lecture: 0, lab: 0, tutorial: 0 };
  list.forEach((c) => SESSION_TYPES.forEach((t) => (out[t.key] = Math.max(out[t.key], c[t.field] ?? 0))));
  return out;
};

// Credits per week: 1 for every lecture and every lab, 0.5 for every tutorial (same rule as the backend).
export const creditsOf = (types) => types.lecture + types.lab + types.tutorial * 0.5;
export const formatCredits = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const sameTypes = (a, b) => SESSION_TYPES.every((t) => a[t.key] === b[t.key]);

// Number per week: type it directly, or use the up / down chevrons. Stays between 1 and MAX_PER_WEEK.
function CountStepper({ value, onChange, disabled, label }) {
  const [draft, setDraft] = useState(null); // what is being typed; null = show the real value
  const set = (n) => onChange(Math.min(MAX_PER_WEEK, Math.max(1, n)));
  return (
    <div className={`adm-count ${disabled ? "off" : ""}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`${label} per week`}
        value={disabled ? "0" : draft ?? String(value)}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const n = digits === "" ? null : parseInt(digits, 10);
          setDraft(n !== null && n > MAX_PER_WEEK ? String(MAX_PER_WEEK) : digits); // never show more than the maximum
          if (n !== null) set(n);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setDraft(null);
            set(value + 1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setDraft(null);
            set(value - 1);
          }
        }}
      />
      <span className="adm-count-chev">
        <button type="button" aria-label={`More ${label} per week`} disabled={disabled || value >= MAX_PER_WEEK} onClick={() => { setDraft(null); set(value + 1); }}>
          <ChevronUp size={14} aria-hidden="true" />
        </button>
        <button type="button" aria-label={`Fewer ${label} per week`} disabled={disabled || value <= 1} onClick={() => { setDraft(null); set(value - 1); }}>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

// One row per kind: switch it on or off, and say how many a week. At least one kind stays on.
export function SessionTypePicker({ value, onChange, disabled, label = "Sessions" }) {
  const on = SESSION_TYPES.filter((t) => value[t.key] > 0).length;
  return (
    <div className="adm-field adm-types-field adm-scale-sessions" role="group" aria-label={label}>
      <span className="adm-types-label">{label}</span>
      <div className="adm-sessions-body">
      <div className="adm-type-rows">
        {SESSION_TYPES.map(({ key, label: text, Icon }) => {
          const pressed = value[key] > 0;
          const last = pressed && on === 1;
          return (
            <div className="adm-type-row" key={key}>
              <button
                type="button"
                className={`adm-type ${pressed ? "on" : ""}`}
                aria-pressed={pressed}
                disabled={disabled || last}
                title={last ? "A subject needs at least one session type" : undefined}
                onClick={() => onChange({ ...value, [key]: pressed ? 0 : 1 })}
              >
                <Icon size={18} aria-hidden="true" /> {text}
              </button>
              <CountStepper
                label={text}
                value={Math.max(value[key], 1)}
                disabled={disabled || !pressed}
                onChange={(n) => onChange({ ...value, [key]: n })}
              />
              <span className="adm-per-week">per week</span>
            </div>
          );
        })}
      </div>
      <CreditsCard types={value} />
      </div>
      <span className="db-sm">Switch on every kind of session this subject has, and set how many each week.</span>
    </div>
  );
}

// The subject's credits, big, updating as the counts change.
export function CreditsCard({ types }) {
  const credits = creditsOf(types);
  const part = (n, each) => (n > 0 ? `${n} × ${each}` : null);
  const sum = [part(types.lecture, "1"), part(types.lab, "1"), part(types.tutorial, "0.5")].filter(Boolean);
  return (
    <div className="adm-credits" role="status" aria-label={`${formatCredits(credits)} credits`}>
      <span className="adm-credits-label">Credits</span>
      <b key={credits} className="adm-credits-num">{formatCredits(credits)}</b>
      <span className="adm-credits-sum">{sum.join(" + ") || "—"}</span>
      <span className="adm-credits-rule">Lecture or lab 1 each · Tutorial 0.5 each</span>
    </div>
  );
}

export const CATEGORIES = [
  { key: "core", label: "Core" },
  { key: "elective", label: "Elective" },
];
export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? "Core";

// Core or Elective: exactly one, like radio buttons.
export function CategoryPicker({ value, onChange, disabled, label = "Category" }) {
  return (
    <div className="adm-field adm-types-field adm-scale-category" role="radiogroup" aria-label={label}>
      <span className="adm-types-label">{label}</span>
      <div className="adm-types">
        {CATEGORIES.map(({ key, label: text }) => {
          const checked = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={checked}
              className={`adm-type ${checked ? "on" : ""}`}
              disabled={disabled}
              onClick={() => onChange(key)}
            >
              {text}
            </button>
          );
        })}
      </div>
      <span className="db-sm">Is this subject compulsory (core) or optional (elective)? Choose one.</span>
    </div>
  );
}

export function TypeChips({ types }) {
  return (
    <span className="adm-chips">
      {SESSION_TYPES.filter((t) => types[t.key] > 0).map((t) => (
        <span key={t.key} className="adm-chip">
          {t.label}
          {types[t.key] > 1 ? ` ×${types[t.key]}` : ""}
        </span>
      ))}
    </span>
  );
}
