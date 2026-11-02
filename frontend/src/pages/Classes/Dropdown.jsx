// src/pages/Classes/Dropdown.jsx
// Single-select dropdown for the All Classes toolbar (filters and sort). Button + listbox pattern:
// Enter/Space/Arrow keys open it, Arrow/Home/End move, Enter/Space pick, Escape/Tab/outside click close.
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function Dropdown({ label, value, options, onChange, ariaLabel, icon: Icon, active = false, align = "left", className = "" }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[selectedIndex];

  const show = (index = selectedIndex) => {
    setCursor(index);
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };
  const pick = (index) => {
    onChange(options[index].value);
    hide();
  };

  // Focus the list once it is open; close on a click outside
  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.focus();
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view in long lists
  useEffect(() => {
    if (open) listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  const onButtonKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e) => {
    const last = options.length - 1;
    const moves = {
      ArrowDown: Math.min(cursor + 1, last),
      ArrowUp: Math.max(cursor - 1, 0),
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      setCursor(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(cursor);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      // Type-ahead: jump to the next option starting with the typed letter
      const k = e.key.toLowerCase();
      const n = options.length;
      for (let step = 1; step <= n; step += 1) {
        const i = (cursor + step) % n;
        if (options[i].label.toLowerCase().startsWith(k)) {
          setCursor(i);
          break;
        }
      }
    }
  };

  return (
    <div ref={rootRef} className={`cx-dd ${open ? "open" : ""} ${active ? "on" : ""} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="cx-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${ariaLabel}: ${current?.label}`}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onButtonKey}
      >
        {Icon && <Icon size={15} strokeWidth={2} className="cx-dd-ico" aria-hidden="true" />}
        {label && <span className="cx-dd-k">{label}</span>}
        <span className="cx-dd-v">{current?.label}</span>
        <ChevronDown size={15} strokeWidth={2} className="cx-dd-chev" aria-hidden="true" />
      </button>
      <ul
        ref={listRef}
        id={`${id}-list`}
        className={`cx-dd-menu ${align === "right" ? "right" : ""}`}
        role="listbox"
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${id}-o${cursor}` : undefined}
        onKeyDown={onListKey}
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${id}-o${i}`}
            role="option"
            aria-selected={i === selectedIndex}
            className={i === cursor ? "cur" : ""}
            onPointerEnter={() => setCursor(i)}
            onClick={() => pick(i)}
          >
            <span>{o.label}</span>
            {i === selectedIndex && <Check size={15} strokeWidth={2.4} aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
