// Deleting a teacher is permanent, so it is a two-stage action:
// 1) the admin confirms in a dialog, 2) the account stays for DELETE_DELAY_SECONDS with an
// "Undo" notification, then the server deletes it for good. The timer lives in the admin
// layout, so it keeps running while the admin moves between admin pages.
// It is a browser timer: closing or reloading the tab cancels a pending deletion (the
// browser warns first), it never deletes by surprise.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Trash2, Undo2, X } from "lucide-react";
import { deleteUser } from "../../api/users";
import { useAdminData } from "../../context/AdminDataContext";

export const DELETE_DELAY_SECONDS = 20;

// 14 -> "0:14"
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const DeletionContext = createContext(null);

export function useTeacherDeletion() {
  const context = useContext(DeletionContext);
  if (!context) throw new Error("useTeacherDeletion must be used within a TeacherDeletionProvider");
  return context;
}

export function TeacherDeletionProvider({ children }) {
  const { refresh } = useAdminData();
  const [pending, setPending] = useState({}); // userId -> { user, endsAt }
  const [notes, setNotes] = useState([]); // finished / failed notices
  const [now, setNow] = useState(() => Date.now());
  const running = useRef(new Set());
  const noteId = useRef(0);

  const addNote = useCallback((kind, text) => {
    const id = ++noteId.current;
    setNotes((list) => [...list, { id, kind, text }]);
    setTimeout(() => setNotes((list) => list.filter((n) => n.id !== id)), kind === "error" ? 10000 : 6000);
  }, []);

  const schedule = useCallback((user) => {
    setNow(Date.now());
    setPending((p) => ({ ...p, [user.id]: { user, endsAt: Date.now() + DELETE_DELAY_SECONDS * 1000 } }));
  }, []);

  const cancel = useCallback((userId) => {
    setPending((p) => {
      const next = { ...p };
      delete next[userId];
      return next;
    });
  }, []);

  const count = Object.keys(pending).length;

  // Tick while anything is counting down.
  useEffect(() => {
    if (!count) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [count]);

  // When a countdown reaches zero, delete for real.
  useEffect(() => {
    Object.values(pending).forEach(({ user, endsAt }) => {
      if (now < endsAt || running.current.has(user.id)) return;
      running.current.add(user.id);
      deleteUser(user.id)
        .then(() => addNote("ok", `${user.name} was permanently deleted.`))
        .catch((err) => addNote("error", `${user.name} was not deleted: ${err.message}`))
        .finally(() => {
          running.current.delete(user.id);
          cancel(user.id);
          refresh();
        });
    });
  }, [now, pending, addNote, cancel, refresh]);

  // Leaving the page would silently cancel a pending deletion, so ask first.
  useEffect(() => {
    if (!count) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [count]);

  const secondsLeft = useCallback((userId) => {
    const entry = pending[userId];
    return entry ? Math.max(0, Math.ceil((entry.endsAt - now) / 1000)) : null;
  }, [pending, now]);

  const dismissNote = useCallback((id) => setNotes((list) => list.filter((n) => n.id !== id)), []);

  const value = useMemo(
    () => ({ pending, notes, schedule, cancel, secondsLeft, dismissNote }),
    [pending, notes, schedule, cancel, secondsLeft, dismissNote]
  );

  return (
    <DeletionContext.Provider value={value}>
      {children}
    </DeletionContext.Provider>
  );
}

// The countdown and result notifications. Rendered inside the admin layout so they pick up its styles.
export function DeletionToasts() {
  const { pending, notes, cancel, secondsLeft, dismissNote } = useTeacherDeletion();
  return (
    <div className="adm-toasts" aria-live="polite">
      {Object.values(pending).map(({ user }) => {
        const left = secondsLeft(user.id) ?? 0;
        return (
          <div key={user.id} className="adm-toast adm-toast-warn" role="status">
            <Trash2 size={18} aria-hidden="true" />
            <div className="adm-toast-body">
              <b>Deleting {user.name}</b>
              <span aria-hidden="true">Removed for good when the timer ends</span>
              <span className="adm-toast-bar" aria-hidden="true">
                <i style={{ width: `${(left / DELETE_DELAY_SECONDS) * 100}%` }} />
              </span>
            </div>
            <span className="adm-toast-clock" role="timer" aria-label={`${left} seconds left to undo`}>{clock(left)}</span>
            <button type="button" className="db-btn adm-sm" onClick={() => cancel(user.id)}>
              <Undo2 size={14} aria-hidden="true" /> Undo
            </button>
          </div>
        );
      })}
      {notes.map((n) => (
        <div key={n.id} className={`adm-toast ${n.kind === "ok" ? "adm-toast-ok" : "adm-toast-err"}`} role={n.kind === "ok" ? "status" : "alert"}>
          {n.kind === "ok" ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
          <div className="adm-toast-body">
            <span>{n.text}</span>
          </div>
          <button type="button" className="adm-icon-btn adm-toast-x" aria-label="Dismiss" onClick={() => dismissNote(n.id)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

// "This is permanent" dialog. Cancel is focused first so Enter never confirms by accident.
export function ConfirmTeacherDelete({ user, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Rendered at the admin root so the backdrop covers the whole screen, not just the page area.
  return createPortal(
    <div className="adm-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc">
        <span className="adm-modal-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <h2 id="del-title">Delete {user.name}?</h2>
        <p id="del-desc">
          This is <b>permanent</b>. The account <span className="adm-mono">{user.email}</span> will be removed from the database
          for good {DELETE_DELAY_SECONDS} seconds after you confirm, and they will no longer be able to sign in. Until then you can
          undo it from the notification.
        </p>
        <div className="adm-modal-actions">
          <button type="button" className="db-btn" ref={cancelRef} onClick={onClose}>
            Keep teacher
          </button>
          <button type="button" className="db-btn adm-danger" onClick={onConfirm}>
            <Trash2 size={15} aria-hidden="true" /> Delete permanently
          </button>
        </div>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}
