// Password input with show/hide, a "Generate strong password" button and Copy.
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { generatePassword } from "./format";

function PasswordGen({ id, label = "Password", value, onChange, disabled, hint }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = () => {
    onChange(generatePassword());
    setShow(true);
    setCopied(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the password is visible, so it can be copied by hand
    }
  };
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-input-group">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setCopied(false);
          }}
          disabled={disabled}
          autoComplete="new-password"
        />
        <button type="button" className="adm-icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <div className="adm-pw-tools">
        <button type="button" className="db-btn adm-gen" onClick={generate} disabled={disabled}>
          <Wand2 size={15} aria-hidden="true" /> Generate strong password
        </button>
        {value && (
          <button type="button" className="db-btn adm-sm" onClick={copy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {hint && <span className="db-sm">{hint}</span>}
    </div>
  );
}

export default PasswordGen;
