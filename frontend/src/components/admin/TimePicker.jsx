// A themed time picker (24-hour): a button showing "09:40" that opens a small panel with a big clock readout
// and a grid of the allowed start times. The value stays "HH:MM", like <input type="time">.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

// Class periods are 50 minutes from 08:00: 08:00, 08:50, ... 17:10.
const toMin = (v) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const PERIOD_STARTS = Array.from({ length: 12 }, (_, i) => toHHMM(8 * 60 + i * 50));
export const addMinutes = (v, n) => (toMin(v) == null ? "" : toHHMM(toMin(v) + n));

// The big readout; each half slides in when it changes.
function Face({ value }) {
  const [h, m] = value ? value.slice(0, 5).split(":") : ["--", "--"];
  return (
    <div className="adm-clk-face" aria-live="polite">
      <span className="adm-clk-roll" key={`h${h}`}>{h}</span>
      <span className="adm-clk-colon">:</span>
      <span className="adm-clk-roll" key={`m${m}`}>{m}</span>
    </div>
  );
}

function TimePicker({ id, label, value, onChange, options = PERIOD_STARTS, disabled, readOnly, hint }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const cur = value ? value.slice(0, 5) : "";

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open) box.current?.querySelector(".adm-clk-grid .on")?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <div className="adm-field adm-clk" ref={box}>
      {label && <label htmlFor={id}>{label}</label>}
      <button
        id={id}
        type="button"
        className={`adm-clk-btn ${open ? "open" : ""} ${cur ? "" : "empty"} ${readOnly ? "ro" : ""}`}
        onClick={() => !readOnly && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup={readOnly ? undefined : "dialog"}
        aria-expanded={readOnly ? undefined : open}
        aria-readonly={readOnly || undefined}
        title={readOnly ? hint : undefined}
      >
        <Clock size={15} aria-hidden="true" />
        <span className="adm-clk-val" key={cur}>{cur || (readOnly ? "--:--" : "Set time")}</span>
        {readOnly && hint && <small>{hint}</small>}
      </button>
      {open && (
        <div className="adm-clk-pop" role="dialog" aria-label={label || "Choose a time"}>
          <Face value={cur} />
          <div className="adm-clk-grid" role="listbox" aria-label={label || "Times"}>
            {options.map((t) => (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={cur === t}
                className={cur === t ? "on" : ""}
                onClick={() => {
                  onChange(t);
                  setTimeout(() => setOpen(false), 160);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimePicker;
