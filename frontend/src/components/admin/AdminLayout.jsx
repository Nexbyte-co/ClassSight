// Admin area frame: top bar, collapsible left sidebar (desktop) and slide-in drawer (mobile).
// Mirrors the teacher shell's look and behaviour using the same db-* / app-nav-* styles,
// but is its own component so the teacher UI is untouched.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  LayoutDashboard,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  ScanFace,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../navigation/AppNavigationDrawer.css";
import "./admin.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { AdminDataProvider } from "../../context/AdminDataContext";

const ADMIN_NAV = [
  { to: "/admin", key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/admin/users", key: "users", label: "Users", Icon: Users },
  { to: "/admin/classes", key: "classes", label: "Classes & Subjects", Icon: BookOpen },
  { to: "/admin/attendance", key: "attendance", label: "Attendance & Reports", Icon: ClipboardCheck },
  { to: "/admin/analytics", key: "analytics", label: "Analytics", Icon: ChartColumn },
  { to: "/admin/settings", key: "settings", label: "Settings", Icon: Settings },
];

// /admin/setup (the class setup steps) belongs to Classes & Subjects.
function activeKeyFor(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return "dashboard";
  if (path.startsWith("/admin/setup")) return "classes";
  const hit = ADMIN_NAV.find((item) => item.to !== "/admin" && path.startsWith(item.to));
  return hit ? hit.key : "dashboard";
}

const MOBILE_NAV_QUERY = "(max-width: 700px)";
const SIDE_COLLAPSED_KEY = "cs-admin-side-collapsed";
const readSideCollapsed = () => {
  try {
    return localStorage.getItem(SIDE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

// Top-right account menu, same look and keyboard behaviour as the teacher/student one.
function AdminProfileMenu({ session, initials, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="user-profile-wrapper teacher-profile-menu" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${session?.name || "Admin"} — account menu`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="profile-avatar" aria-hidden="true">{initials}</span>
        <span className="profile-stack">
          <span className="profile-stack-name">{session?.name || "Admin"}</span>
          <span className="profile-stack-dept">Administrator</span>
        </span>
        <ChevronDown size={16} strokeWidth={2} className={`profile-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="dropdown-menu" role="menu" aria-label="Account">
          <div className="dropdown-user-header">
            <div className="dropdown-user-name">{session?.name || "Admin"}</div>
            <div className="dropdown-user-email">{session?.email}</div>
          </div>
          <Link to="/admin/settings" role="menuitem" className="dropdown-item" onClick={() => setOpen(false)}>
            <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <div className="dropdown-divider" role="separator" />
          <button type="button" role="menuitem" className="dropdown-item dropdown-item-danger" onClick={onSignOut}>
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

let lastPill = null; // keeps the active pill's position between page changes

function AdminSidebar({ active, collapsed }) {
  const navRef = useRef(null);
  const [pill, setPill] = useState(lastPill);
  const [pillAnimates, setPillAnimates] = useState(false);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const place = () => {
      const item = nav.querySelector(".db-ni.on");
      if (!item) return setPill(null);
      const n = nav.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      const next = { top: r.top - n.top, height: r.height };
      lastPill = next;
      setPill((p) => (p && p.top === next.top && p.height === next.height ? p : next));
    };
    const frame = requestAnimationFrame(() => {
      setPillAnimates(true);
      place();
    });
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [active, collapsed]);

  return (
    <aside className={`db-side ${collapsed ? "c" : ""}`} aria-label="Admin navigation">
      <nav className="db-nav" ref={navRef}>
        {pill && (
          <span
            className={`db-ind ${pillAnimates ? "anim" : ""}`}
            style={{ top: pill.top, height: pill.height }}
            aria-hidden="true"
          />
        )}
        {ADMIN_NAV.map(({ to, key, label, Icon }) => {
          const isOn = key === active;
          return (
            <Link
              key={to}
              to={to}
              className={`db-ni ${isOn ? "on" : ""}`}
              aria-current={isOn ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} strokeWidth={2} />
              <span className="db-tx">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function AdminDrawer({ isOpen, onClose, active }) {
  const drawerRef = useRef(null);

  // Tap/click outside or Escape closes it; the toggle button handles itself.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (drawerRef.current?.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".hamburger-nav-btn")) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    document.body.classList.add("app-nav-open");
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("app-nav-open");
    };
  }, [isOpen, onClose]);

  return (
    <aside
      ref={drawerRef}
      className={`app-nav-drawer adm-drawer ${isOpen ? "open" : ""}`}
      aria-label="Admin navigation drawer"
      aria-hidden={!isOpen}
    >
      <div className="app-nav-header">
        <Link to="/admin" className="app-nav-brand" onClick={onClose}>
          <div className="app-nav-brand-icon">
            <ScanFace size={20} strokeWidth={2.2} />
          </div>
          <span className="app-nav-brand-name">ClassSight</span>
        </Link>
      </div>
      <nav className="app-nav-links">
        {ADMIN_NAV.map(({ to, key, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`app-nav-link ${key === active ? "active" : ""}`}
            aria-current={key === active ? "page" : undefined}
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, signOut } = useAuth();
  const active = activeKeyFor(pathname);

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(readSideCollapsed);

  const isMobileNav = () => window.matchMedia(MOBILE_NAV_QUERY).matches;
  const handleToggleNav = () => {
    if (isMobileNav()) setIsNavOpen((open) => !open);
    else
      setIsSideCollapsed((collapsed) => {
        try {
          localStorage.setItem(SIDE_COLLAPSED_KEY, collapsed ? "0" : "1");
        } catch {
          // storage blocked: the toggle still works for this page
        }
        return !collapsed;
      });
  };

  // Sign out lands on the public landing page.
  const handleSignOut = () => {
    setIsNavOpen(false);
    signOut();
    navigate("/", { replace: true });
  };

  const initials = (session?.name || session?.email || "A")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <AdminDataProvider>
      <div className={`dashboard-root db-page teacher-ui admin-ui ${isDarkMode ? "dark-mode" : ""}`}>
        <header className="db-top">
          <div className="db-row">
            <button
              type="button"
              className="db-ib hamburger-nav-btn"
              onClick={handleToggleNav}
              aria-label="Toggle navigation"
              aria-expanded={isMobileNav() ? isNavOpen : !isSideCollapsed}
            >
              <Menu size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <Link to="/admin" className="db-row db-brand-link adm-brand">
              <div className="db-logo">
                <ScanFace size={20} strokeWidth={2} />
              </div>
              <span className="db-brand">ClassSight</span>
            </Link>
          </div>

          <div className="db-row">
            <button
              type="button"
              className="db-ib db-ib-sm"
              onClick={toggleDarkMode}
              aria-label="Night mode"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
            <AdminProfileMenu session={session} initials={initials} onSignOut={handleSignOut} />
          </div>
        </header>

        <div className="db-body">
          <AdminDrawer
            isOpen={isNavOpen}
            onClose={() => setIsNavOpen(false)}
            active={active}
          />
          <AdminSidebar
            active={active}
            collapsed={isSideCollapsed}
          />
          <main className="db-main adm-main" id="admin-main">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminDataProvider>
  );
}

export default AdminLayout;
