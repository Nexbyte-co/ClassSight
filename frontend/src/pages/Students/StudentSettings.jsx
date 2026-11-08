// src/pages/Students/StudentSettings.jsx
// Student settings, split into tabs like the teacher Settings page (and built from its parts).
// Everything a student can change applies straight away and is stored in this browser; records,
// the attendance requirement and face data belong to the college and are read-only or "Needs server".
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, UserRound, Bell, ClipboardCheck, ScanFace, Palette, ShieldCheck, LifeBuoy } from "lucide-react";
import "../Settings/Settings.css";
import "./StudentSettings.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
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
  const [params, setParams] = useSearchParams();
  const activeId = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "profile";
  const { Panel } = TABS.find((t) => t.id === activeId);
  const tabRefs = useRef({});
  const { isDarkMode } = useTheme();
  const { session } = useDemoSession();
  const m = useStudentModel();

  const selectTab = (id, focus = false) => {
    setParams(id === "profile" ? {} : { tab: id }, { replace: true });
    if (focus) tabRefs.current[id]?.focus();
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === activeId);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(TABS[(next + TABS.length) % TABS.length].id, true);
  };

  return (
    <div className={`db-page teacher-ui sp-chrome sp-setwrap ${isDarkMode ? "dark-mode" : ""}`}>
      <main className="db-main ts-main">
        <div className="reports-page-header">
          <h1 className="reports-title">
            <SettingsIcon size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
            <span>Settings</span>
          </h1>
          <p className="reports-subtitle">
            Choose how ClassSight looks and notifies you. Your records are managed by your college; settings marked{" "}
            <strong>Needs server</strong> become available once your account is connected to the ClassSight server.
          </p>
        </div>

        <div className="cs-tabs ts-tabs" role="tablist" aria-label="Settings sections" onKeyDown={onTabKey}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              ref={(el) => (tabRefs.current[id] = el)}
              id={`ss-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={id === activeId}
              aria-controls={`ss-panel-${id}`}
              tabIndex={id === activeId ? 0 : -1}
              className={`cs-tab ${id === activeId ? "on" : ""}`}
              onClick={() => selectTab(id)}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              {label}
              {id === activeId && <span className="cs-tab-ink" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="ts-panel" role="tabpanel" id={`ss-panel-${activeId}`} aria-labelledby={`ss-tab-${activeId}`} tabIndex={0}>
          <Panel key={activeId} m={m} session={session} goToTab={selectTab} />
        </div>
      </main>
    </div>
  );
}
