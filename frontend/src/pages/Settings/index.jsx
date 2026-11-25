// src/pages/Settings/index.jsx
// Teacher settings on one scrolling page: every section has its own heading and cards; the sticky
// bar at the top jumps to a section (?tab=<id> links land on it too). Account details, password,
// sign-ins and requests come from the API; the remaining preferences are stored in this browser.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Settings as SettingsIcon,
  AlertTriangle,
  UserRound,
  Bell,
  BarChart3,
  Palette,
  ShieldCheck,
  LifeBuoy,
  Send,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../../styles/Reports.css";
import "./Settings.css";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useSettings } from "../../context/settings/SettingsContext";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { validateThreshold, validateLectureMinutes } from "../../context/settings/settingsStore";
import {
  AccountTab,
  NotificationsTab,
  ReportsTab,
  AppearanceTab,
  SecurityTab,
  HelpTab,
} from "./SettingsTabs";
import { RequestsTab } from "./RequestsTab";

const SECTIONS = [
  { id: "account", label: "Account & Profile", Icon: UserRound, Panel: AccountTab },
  { id: "requests", label: "Requests", Icon: Send, Panel: RequestsTab },
  { id: "notifications", label: "Notifications", Icon: Bell, Panel: NotificationsTab },
  { id: "reports", label: "Reports & Analytics", Icon: BarChart3, Panel: ReportsTab },
  { id: "appearance", label: "Appearance", Icon: Palette, Panel: AppearanceTab },
  { id: "security", label: "Security & Privacy", Icon: ShieldCheck, Panel: SecurityTab },
  { id: "help", label: "Help & Support", Icon: LifeBuoy, Panel: HelpTab },
];

// Saved-in-browser fields edited through drafts (Save / Discard); everything else applies instantly
const toDraft = (s) => ({
  attendanceThreshold: String(s.attendanceThreshold),
  defaultLectureMinutes: String(s.defaultLectureMinutes),
});

function useSettingsDraft() {
  const settings = useSettings();
  const saved = toDraft(settings);
  const [draft, setDraft] = useState(saved);

  const errors = {
    attendanceThreshold: validateThreshold(draft.attendanceThreshold),
    defaultLectureMinutes: validateLectureMinutes(draft.defaultLectureMinutes),
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
  const [params] = useSearchParams();
  const sectionRefs = useRef({});
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  const form = useSettingsDraft();
  const guard = useUnsavedChangesGuard(form.isDirty);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return undefined;
    const t = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const goTo = (id, smooth = true) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  // ?tab=<id> (links from the bell, dashboard, Help) opens the page at that section
  const target = params.get("tab");
  useEffect(() => {
    if (target && SECTIONS.some((x) => x.id === target)) requestAnimationFrame(() => goTo(target, false));
  }, [target]);

  // Highlight the section being read: the last one whose heading has passed under the bars
  useEffect(() => {
    const onScroll = () => {
      const line = 64 + 60; // top bar + jump bar
      let current = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top - line <= 8) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActiveId(atBottom ? SECTIONS[SECTIONS.length - 1].id : current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <TeacherShell active="settings" rootClassName="reports-root settings-root">
      <main className="reports-main ts-main">
        <div className="reports-page-header">
          <h1 className="reports-title">
            <SettingsIcon size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
            <span>Settings</span>
          </h1>
          <p className="reports-subtitle">
            Your account, password, requests to the admin and preferences.
          </p>
        </div>

        <nav className="cs-tabs ts-tabs ts-jump" aria-label="Settings sections">
          {SECTIONS.map(({ id, label, Icon }) => (
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
          {SECTIONS.map(({ id, label, Icon, Panel }) => (
            <section
              key={id}
              id={`ts-sec-${id}`}
              ref={(el) => (sectionRefs.current[id] = el)}
              className="ts-sec"
              aria-labelledby={`ts-sec-${id}-title`}
            >
              <h2 className="ts-sec-title" id={`ts-sec-${id}-title`}>
                <span className="ts-sec-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                {label}
              </h2>
              <div className="ts-panel">
                <Panel form={form} goToTab={goTo} />
              </div>
            </section>
          ))}
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
