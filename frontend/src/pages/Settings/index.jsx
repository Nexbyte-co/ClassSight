// src/pages/Settings/index.jsx
// Teacher settings, split into tabs. Only settings the app can act on are editable; they are
// stored in this browser. Account, notifications, security and other server-backed settings are
// shown in a disabled "Needs server" state instead of pretending to save.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Settings as SettingsIcon,
  AlertTriangle,
  UserRound,
  Bell,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Palette,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../../styles/Reports.css";
import "./Settings.css";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useSettings } from "../../context/settings/SettingsContext";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { validateThreshold, validateLectureMinutes, validateDepartment } from "../../context/settings/settingsStore";
import {
  AccountTab,
  NotificationsTab,
  AttendanceTab,
  ScheduleTab,
  ReportsTab,
  AppearanceTab,
  SecurityTab,
  HelpTab,
} from "./SettingsTabs";

const TABS = [
  { id: "account", label: "Account & Profile", Icon: UserRound, Panel: AccountTab },
  { id: "notifications", label: "Notifications", Icon: Bell, Panel: NotificationsTab },
  { id: "attendance", label: "Attendance", Icon: ClipboardCheck, Panel: AttendanceTab },
  { id: "schedule", label: "Class & Schedule", Icon: CalendarDays, Panel: ScheduleTab },
  { id: "reports", label: "Reports & Analytics", Icon: BarChart3, Panel: ReportsTab },
  { id: "appearance", label: "Appearance", Icon: Palette, Panel: AppearanceTab },
  { id: "security", label: "Security & Privacy", Icon: ShieldCheck, Panel: SecurityTab },
  { id: "help", label: "Help & Support", Icon: LifeBuoy, Panel: HelpTab },
];

// Saved-in-browser fields edited through drafts (Save / Discard); everything else applies instantly
const toDraft = (s) => ({
  attendanceThreshold: String(s.attendanceThreshold),
  defaultLectureMinutes: String(s.defaultLectureMinutes),
  defaultDepartment: s.defaultDepartment,
});

function useSettingsDraft() {
  const settings = useSettings();
  const saved = toDraft(settings);
  const [draft, setDraft] = useState(saved);

  const errors = {
    attendanceThreshold: validateThreshold(draft.attendanceThreshold),
    defaultLectureMinutes: validateLectureMinutes(draft.defaultLectureMinutes),
    defaultDepartment: validateDepartment(draft.defaultDepartment),
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const changed = Object.keys(saved).filter((k) => draft[k].trim() !== saved[k]);

  return {
    draft,
    errors,
    hasErrors,
    changed,
    isDirty: changed.length > 0,
    set: (key, value) => setDraft((d) => ({ ...d, [key]: value })),
    discard: () => setDraft(saved),
    save: () => {
      const next = {
        attendanceThreshold: Number(draft.attendanceThreshold),
        defaultLectureMinutes: Number(draft.defaultLectureMinutes),
        defaultDepartment: draft.defaultDepartment.trim(),
      };
      settings.updateSettings(next);
      setDraft(toDraft(next));
    },
    reset: (key, value) => {
      settings.updateSettings({ [key]: value });
      setDraft((d) => ({ ...d, [key]: String(value) }));
    },
    saved: settings,
  };
}

// Protects unsaved Settings edits: in-app link clicks ask for confirmation first,
// and reloading/closing the tab triggers the browser's own warning.
function useUnsavedChangesGuard(isDirty) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState(null);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    // Capture phase: runs before React Router's link handler
    const onClick = (e) => {
      if (!isDirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = url.pathname + url.search + url.hash;
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(to);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return {
    pendingHref,
    stay: () => setPendingHref(null),
    discard: () => {
      const to = pendingHref;
      isDirtyRef.current = false;
      setPendingHref(null);
      navigate(to);
    },
  };
}

function DiscardChangesDialog({ onStay, onDiscard }) {
  const dialogRef = useDialogA11y(true, onStay);
  return (
    <div className="cs-modal-backdrop" onClick={onStay}>
      <div
        className="cs-modal-card cs-modal-confirm settings-discard-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-modal-header">
          <div className="confirm-icon-danger">
            <AlertTriangle size={22} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <h3 id="discard-title">Discard unsaved changes?</h3>
            <p id="discard-desc" className="cs-modal-subtitle">
              You have edits in Settings that haven&apos;t been saved. If you leave now, they will be discarded.
            </p>
          </div>
        </div>
        <div className="cs-modal-actions">
          <button type="button" className="btn-modal-submit settings-stay" onClick={onStay}>
            Stay on this page
          </button>
          <button type="button" className="btn-modal-delete-confirm settings-discard" onClick={onDiscard}>
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Sticky bar shown while there are unsaved edits, then a short confirmation after saving
function SaveBar({ form, savedFlash, onSave }) {
  if (!form.isDirty && !savedFlash) return <div className="ts-savebar-spacer" />;
  return (
    <div className={`ts-savebar ${form.isDirty ? "" : "is-saved"}`} role="status" aria-live="polite">
      <span className="ts-savebar-text">
        {form.isDirty
          ? `${form.changed.length} unsaved ${form.changed.length === 1 ? "change" : "changes"}${
              form.hasErrors ? " — fix the highlighted field first" : ""
            }`
          : "Changes saved in this browser"}
      </span>
      {form.isDirty && (
        <div className="ts-savebar-actions">
          <button type="button" className="btn-modal-cancel" onClick={form.discard}>
            Discard
          </button>
          <button type="button" className="btn-modal-submit" onClick={onSave} disabled={form.hasErrors}>
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [params, setParams] = useSearchParams();
  const activeId = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "account";
  const active = TABS.find((t) => t.id === activeId);
  const tabRefs = useRef({});

  const form = useSettingsDraft();
  const guard = useUnsavedChangesGuard(form.isDirty);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return undefined;
    const t = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const selectTab = (id, focus = false) => {
    setParams(id === "account" ? {} : { tab: id }, { replace: true });
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

  const { Panel } = active;

  return (
    <TeacherShell active="settings" rootClassName="reports-root settings-root">
      <main className="reports-main ts-main">
        <div className="reports-page-header">
          <h1 className="reports-title">
            <SettingsIcon size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
            <span>Settings</span>
          </h1>
          <p className="reports-subtitle">
            Manage your preferences. Settings marked <strong>Needs server</strong> become available once your
            account is connected to the ClassSight server.
          </p>
        </div>

        <div className="cs-tabs ts-tabs" role="tablist" aria-label="Settings sections" onKeyDown={onTabKey}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              ref={(el) => (tabRefs.current[id] = el)}
              id={`ts-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={id === activeId}
              aria-controls={`ts-panel-${id}`}
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

        <div
          className="ts-panel"
          role="tabpanel"
          id={`ts-panel-${activeId}`}
          aria-labelledby={`ts-tab-${activeId}`}
          tabIndex={0}
        >
          <Panel form={form} goToTab={selectTab} />
        </div>

        <SaveBar
          form={form}
          savedFlash={savedFlash}
          onSave={() => {
            if (form.hasErrors) return;
            form.save();
            setSavedFlash(true);
          }}
        />
      </main>

      {guard.pendingHref && <DiscardChangesDialog onStay={guard.stay} onDiscard={guard.discard} />}
    </TeacherShell>
  );
}

export default Settings;
