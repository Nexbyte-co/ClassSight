// src/pages/Students/StudentSettings.jsx
// Student settings on one scrolling page like the teacher Settings page (and built from its parts): a heading
// per section and a sticky bar that jumps to one (?tab=<id> links land on it too).
// Everything a student can change applies straight away and is stored in this browser; records,
// the attendance requirement and face data belong to the college and are read-only.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, UserRound, Bell, ClipboardCheck, ScanFace, Palette, ShieldCheck, LifeBuoy } from "lucide-react";
import "../Settings/Settings.css";
import "./StudentSettings.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useStudentModel } from "../../context/students/useStudentModel";
import {
  ProfileTab,
  NotificationsTab,
  AttendanceTab,
  FaceTab,
  AppearanceTab,
  SecurityTab,
  HelpTab,
} from "./settings/StudentSettingsTabs";

const TABS = [
  { id: "profile", label: "Profile", Icon: UserRound, Panel: ProfileTab },
  { id: "notifications", label: "Notifications", Icon: Bell, Panel: NotificationsTab },
  { id: "attendance", label: "Attendance rules", Icon: ClipboardCheck, Panel: AttendanceTab },
  { id: "face", label: "Face data", Icon: ScanFace, Panel: FaceTab },
  { id: "appearance", label: "Appearance", Icon: Palette, Panel: AppearanceTab },
  { id: "security", label: "Security", Icon: ShieldCheck, Panel: SecurityTab },
  { id: "help", label: "Help & Support", Icon: LifeBuoy, Panel: HelpTab },
];

export default function StudentSettings() {
  const [params] = useSearchParams();
  const sectionRefs = useRef({});
  const scrollRef = useRef(null);
  const [activeId, setActiveId] = useState(TABS[0].id);
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const m = useStudentModel();

  const goTo = (id, smooth = true) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  // ?tab=<id> (links from the bell, dashboard, Help) opens the page at that section
  const target = params.get("tab");
  useEffect(() => {
    if (target && TABS.some((t) => t.id === target)) requestAnimationFrame(() => goTo(target, false));
  }, [target]);

  // Highlight the section being read: the last one whose heading has passed under the jump bar.
  // The page scrolls inside the portal frame, not the window.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return undefined;
    const onScroll = () => {
      const line = box.getBoundingClientRect().top + 60; // jump bar
      let current = TABS[0].id;
      for (const { id } of TABS) {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top - line <= 8) current = id;
      }
      const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 4;
      setActiveId(atBottom ? TABS[TABS.length - 1].id : current);
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`db-page teacher-ui sp-chrome sp-setwrap ${isDarkMode ? "dark-mode" : ""}`}>
      <main className="db-main ts-main" ref={scrollRef}>
        <div className="reports-page-header">
          <h1 className="reports-title">
            <SettingsIcon size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
            <span>Settings</span>
          </h1>
          <p className="reports-subtitle">
            Your profile, password and how ClassSight looks and notifies you. Your records are managed by your college.
          </p>
        </div>

        <nav className="cs-tabs ts-tabs ts-jump" aria-label="Settings sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={id === activeId ? "true" : undefined}
              className={`cs-tab ${id === activeId ? "on" : ""}`}
              onClick={() => goTo(id)}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              {label}
              {id === activeId && <span className="cs-tab-ink" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        <div className="ts-sections">
          {TABS.map(({ id, label, Icon, Panel }) => (
            <section
              key={id}
              id={`ss-sec-${id}`}
              ref={(el) => (sectionRefs.current[id] = el)}
              className="ts-sec"
              aria-labelledby={`ss-sec-${id}-title`}
            >
              <h2 className="ts-sec-title" id={`ss-sec-${id}-title`}>
                <span className="ts-sec-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                {label}
              </h2>
              <div className="ts-panel">
                <Panel m={m} session={session} goToTab={goTo} />
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
