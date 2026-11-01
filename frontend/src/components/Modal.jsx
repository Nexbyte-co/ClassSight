import { X } from "lucide-react";
import { useDialogA11y } from "../hooks/useDialogA11y";

// Accessible dialog in the existing cs-modal look: Escape closes, Tab stays inside, focus returns.
function Modal({ title, onClose, children, wide = false }) {
  const ref = useDialogA11y(true, onClose);
  return (
    <div className="cs-modal-backdrop" onClick={onClose}>
      <div
        className={`cs-modal-card ${wide ? "student-details-modal" : ""}`}
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={wide ? undefined : { maxWidth: 560 }}
      >
        <div className="student-modal-header">
          <h2 style={{ margin: 0, fontSize: 19 }}>{title}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="mg-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
