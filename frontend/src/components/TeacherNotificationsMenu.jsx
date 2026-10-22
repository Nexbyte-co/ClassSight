// src/components/TeacherNotificationsMenu.jsx
// Shared teacher notifications dropdown (demo content supplied by each page).
// Accessible: aria-expanded/controls, Escape and outside click close it, focus returns
// to the bell. Pass `open`/`onOpenChange` to coordinate with the profile menu.
import { useEffect, useId, useRef } from "react";
import { Bell } from "lucide-react";

function TeacherNotificationsMenu({ items, open, onOpenChange }) {
  const panelId = useId();
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) onOpenChange(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="teacher-notifications-menu" ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        ref={triggerRef}
        className="header-icon-btn"
        onClick={() => onOpenChange(!open)}
        aria-label={`Notifications (${items.length})`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
        <span className="notification-badge" aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-menu teacher-notifications-panel" id={panelId} role="region" aria-label="Notifications">
          <div className="dropdown-user-header">
            <div className="dropdown-user-name">Notifications</div>
            <div className="dropdown-user-email">Classroom attendance alerts · demo content</div>
          </div>
          {items.length === 0 ? (
            <p className="teacher-notification-empty">No notifications.</p>
          ) : (
            <ul className="teacher-notification-list">
              {items.map((n) => (
                <li key={n.id} className="teacher-notification-item">
                  {n.title && <div className="teacher-notification-title">{n.title}</div>}
                  <div className="teacher-notification-text">{n.text}</div>
                  {n.time && <div className="teacher-notification-time">{n.time}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default TeacherNotificationsMenu;
