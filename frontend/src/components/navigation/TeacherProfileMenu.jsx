// src/components/navigation/TeacherProfileMenu.jsx
// Shared teacher profile control: avatar + full name + chevron, with an accessible
// dropdown (keyboard, Escape, outside click). Pass `open`/`onOpenChange` to coordinate
// with other header menus; otherwise it manages its own state. Identity comes from /auth/me.
import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import { logout } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../../utils/initials";

// "Parv Rawat" -> "P. Rawat" for the compact header variant
function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : parts[0] || "";
}

// variant "stacked" shows the short name over the department (Dashboard header)
function TeacherProfileMenu({ open: controlledOpen, onOpenChange, variant }) {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const teacher = {
    name: session?.name || "Teacher",
    email: session?.email || "",
    initials: initials(session?.name || session?.email || "T") || "T",
    role: session?.apiRole === "admin" ? "Administrator" : "Teacher",
  };
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value) => (isControlled ? onOpenChange?.(value) : setInternalOpen(value));

  const menuId = useId();
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const focusFirstOnOpen = useRef(false);

  const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];

  // Outside click closes; Escape closes and returns focus to the trigger
  useEffect(() => {
    if (!open) return undefined;
    if (focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      items()[0]?.focus();
    }
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  const handleMenuKeyDown = (e) => {
    const list = items();
    const index = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleSignOut = () => {
    setOpen(false);
    logout(); // also clear any API token from the backend login
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="user-profile-wrapper teacher-profile-menu" ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${teacher.name} — account menu`}
        onClick={(e) => {
          // keyboard activation (Enter/Space) moves focus into the menu
          focusFirstOnOpen.current = !open && e.detail === 0;
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            focusFirstOnOpen.current = true;
            setOpen(true);
          }
        }}
      >
        <span className="profile-avatar" aria-hidden="true">
          {teacher.initials}
        </span>
        {variant === "stacked" ? (
          <span className="profile-stack">
            <span className="profile-stack-name">{shortName(teacher.name)}</span>
            <span className="profile-stack-dept">{teacher.role}</span>
          </span>
        ) : (
          <span className="profile-name">{teacher.name}</span>
        )}
        <ChevronDown size={16} strokeWidth={2} className={`profile-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-menu" id={menuId} role="menu" aria-label="Account" ref={menuRef} onKeyDown={handleMenuKeyDown}>
          <div className="dropdown-user-header">
            <div className="dropdown-user-name">{teacher.name}</div>
            <div className="dropdown-user-email">{teacher.email}</div>
          </div>
          <Link to="/settings" role="menuitem" className="dropdown-item" onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Account Settings</span>
          </Link>
          <div className="dropdown-divider" role="separator" />
          <button type="button" role="menuitem" className="dropdown-item dropdown-item-danger" onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default TeacherProfileMenu;
