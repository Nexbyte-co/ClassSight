import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { termLabel } from "../../utils/termLabel";
import {
  BookOpen,
  CalendarDays,
  CircleCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import ReportsIcon from "./ReportsIcon";
import { useAuth } from "../../context/AuthContext";

const ADMIN_LINK = { to: "/admin", key: "admin", label: "Admin setup", Icon: ShieldCheck };

const SIDEBAR_LINKS = [
  { to: "/dashboard", key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/classes", key: "classes", label: "Classes", Icon: BookOpen },
  { to: "/classes/schedule", key: "schedule", label: "Class Schedule", Icon: CalendarDays },
  { to: "/attendance", key: "attendance", label: "Attendance", Icon: CircleCheck },
  { to: "/students", key: "students", label: "Students", Icon: UserRound },
  { to: "/reports", key: "reports", label: "Reports", Icon: ReportsIcon },
  { to: "/settings", key: "settings", label: "Settings", Icon: Settings },
];

// Keep the active-pill position between TeacherShell mounts so page changes slide smoothly.
let lastPill = null;

/** Shared desktop teacher navigation. It uses the existing db-* styles in Dashboard.css. */
function Sidebar({ active, collapsed, liveBadge = false, onSignOut }) {
  const { session } = useAuth();
  const links = session?.apiRole === "admin" ? [ADMIN_LINK, ...SIDEBAR_LINKS] : SIDEBAR_LINKS;
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
    <aside className={`db-side ${collapsed ? "c" : ""}`} aria-label="Main navigation">
      <nav className="db-nav" ref={navRef}>
        {pill && (
          <span
            className={`db-ind ${pillAnimates ? "anim" : ""}`}
            style={{ top: pill.top, height: pill.height }}
            aria-hidden="true"
          />
        )}
        {links.map(({ to, key, label, Icon }) => {
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
              {key === "attendance" && liveBadge && <span className="db-live">Live</span>}
            </Link>
          );
        })}
      </nav>
      <div className="db-bot">
        <div className="db-term">
          <b>{termLabel()}</b>
          <span>CSE Dept. • Semester 6</span>
          <i>Academic Week 8</i>
        </div>
        <button type="button" className="db-logout" onClick={onSignOut}>
          <LogOut size={16} strokeWidth={2} />
          <span className="db-tx">Log Out Faculty</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
