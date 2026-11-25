// Generic "are you sure" dialog in the admin look. Cancel is focused first so Enter never confirms by accident.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2 } from "lucide-react";

// tone "ok" gives a green confirm (e.g. "Yes, fixed") instead of the red delete; `icon` replaces the trash icon.
function ConfirmDialog({ title, children, confirmLabel = "Delete", cancelLabel = "Cancel", busy = false, tone = "danger", icon: Icon = Trash2, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="adm-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`adm-modal ${tone === "ok" ? "adm-modal-ok" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-desc">
        <span className="adm-modal-icon" aria-hidden="true">
          {tone === "ok" ? <Icon size={22} /> : <AlertTriangle size={22} />}
        </span>
        <h2 id="cd-title">{title}</h2>
        <p id="cd-desc">{children}</p>
        <div className="adm-modal-actions">
          <button type="button" className="db-btn" ref={cancelRef} onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" className={`db-btn ${tone === "ok" ? "adm-ok" : "adm-danger"}`} onClick={onConfirm} disabled={busy}>
            <Icon size={15} aria-hidden="true" /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default ConfirmDialog;
