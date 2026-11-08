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
  LogOut,
  Menu,
  Moon,
  ScanFace,
  Settings,
  ShieldCheck,
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

let lastPill = null; // keeps the active pill's position between page changes

function AdminSidebar({ active, collapsed, onSignOut, session }) {
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
      <div className="db-bot">
        <div className="db-term">
          <b>Administrator</b>
          <span>{session?.name || "Admin"}</span>
          <i>{session?.email}</i>
        </div>
        <button type="button" className="db-logout" onClick={onSignOut}>
          <LogOut size={16} strokeWidth={2} />
          <span className="db-tx">Log Out</span>
        </button>
      </div>
    </aside>
  );
}

function AdminDrawer({ isOpen, onClose, active, onSignOut, session }) {
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
          <span className="adm-brand-text">
            <span className="app-nav-brand-name">ClassSight</span>
            <span className="adm-brand-sub">Administrator</span>
          </span>
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
      <div className="app-nav-footer">
        <div className="app-nav-term-badge">
          <strong>Administrator</strong>
          <span>{session?.email}</span>
        </div>
        <button type="button" className="app-nav-logout-btn" onClick={onSignOut} tabIndex={isOpen ? 0 : -1}>
          <LogOut size={17} strokeWidth={1.8} />
          <span>Log Out</span>
        </button>
      </div>
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
              <span className="adm-brand-text">
                <span className="db-brand">ClassSight</span>
                <span className="adm-brand-sub">Administrator</span>
              </span>
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
            <div className="adm-user" title={session?.email}>
              <span className="adm-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="adm-user-text">
                <span className="adm-user-name">{session?.name || "Admin"}</span>
                <span className="adm-user-role">
                  <ShieldCheck size={12} strokeWidth={2.2} aria-hidden="true" /> Admin
                </span>
              </span>
            </div>
          </div>
        </header>

        <div className="db-body">
          <AdminDrawer
            isOpen={isNavOpen}
            onClose={() => setIsNavOpen(false)}
            active={active}
            onSignOut={handleSignOut}
            session={session}
          />
          <AdminSidebar
            active={active}
            collapsed={isSideCollapsed}
            onSignOut={handleSignOut}
            session={session}
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
