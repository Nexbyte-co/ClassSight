// Combobox: type straight into the field and the matching options drop down below it
// in a scrollable list (it floats over the cards underneath). Pick one with click or Enter.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

function SearchSelect({ id, label, placeholder, options, value, onChange, clearable = true, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open, shown]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (o) => {
    onChange(o);
    close();
  };
  const openList = () => {
    if (open || disabled) return;
    setOpen(true);
    const at = options.indexOf(value);
    setActive(at >= 0 ? at : 0);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      choose(shown[active]);
    }
  };

  return (
    <div className={`adm-field adm-ss ${disabled ? "is-disabled" : ""}`} ref={wrapRef}>
      <label htmlFor={id}>{label}</label>
      <div className={`adm-ss-box ${open ? "open" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          className="adm-ss-input"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          // Closed: show the chosen value. Open: show what is being typed.
          value={open ? query : value}
          placeholder={open && value ? value : placeholder}
          onFocus={openList}
          onClick={openList}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
        {value && clearable && !disabled && (
          <button type="button" className="adm-ss-clear" aria-label={`Clear ${label}`} onClick={() => { onChange(""); close(); }}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="adm-ss-chev"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? `Close ${label} list` : `Open ${label} list`}
          onClick={() => (open ? close() : (openList(), inputRef.current?.focus()))}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && (
          <ul id={listId} role="listbox" className="adm-ss-pop adm-ss-list" ref={listRef}>
            {shown.length ? (
              shown.map((o, i) => (
                <li
                  key={o}
                  role="option"
                  aria-selected={o === value}
                  className={`${i === active ? "act" : ""} ${o === value ? "sel" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                >
                  {o}
                </li>
              ))
            ) : (
              <li className="adm-ss-none" role="presentation">{options.length ? "No match" : "Nothing to choose yet"}</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SearchSelect;
