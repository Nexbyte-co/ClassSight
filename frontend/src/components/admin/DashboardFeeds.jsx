// Admin dashboard feeds: teacher requests (stay until an admin marks them fixed) and
// "Recent activity" (what was added / removed / fixed in the last two weeks).
// Both refresh on a timer so a request another admin is working on shows as locked.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowLeftRight,
  BookPlus,
  BookX,
  CalendarClock,
  Check,
  CheckCheck,
  GraduationCap,
  Inbox,
  Layers,
  LayersPlus,
  Lock,
  MessageSquare,
  Nfc,
  ScanFace,
  UserMinus,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  claimRequest,
  listActivity,
  listOpenRequests,
  releaseRequest,
  requestKindLabel,
  resolveRequest,
} from "../../api/requests";
import ConfirmDialog from "./ConfirmDialog";
import { Card, Empty } from "./ui";

const REQUEST_POLL_MS = 15000;
const ACTIVITY_POLL_MS = 30000;

const KIND_ICON = {
  face_reenroll: ScanFace,
  batch_change: ArrowLeftRight,
  degree_programme: GraduationCap,
  nfc_card: Nfc,
  subject_add: BookPlus,
  schedule_change: CalendarClock,
  other: MessageSquare,
};

const EVENT_ICON = {
  teacher_added: UserPlus,
  admin_added: UserPlus,
  teacher_removed: UserMinus,
  student_added: UserPlus,
  student_removed: UserMinus,
  batch_added: LayersPlus,
  batch_removed: Layers,
  subject_added: BookPlus,
  subject_removed: BookX,
  request_fixed: CheckCheck,
};
const eventTone = (kind) => (kind === "request_fixed" ? "ok" : kind.endsWith("_removed") ? "bad" : "");

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
const fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function usePolling(load, ms) {
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), ms);
    return () => clearInterval(t);
  }, [load, ms]);
}

/** Requests + activity, loaded together so fixing a request also refreshes the activity list. */
export function useDashboardFeeds() {
  const [requests, setRequests] = useState({ loading: true, error: "", rows: [] });
  const [activity, setActivity] = useState({ loading: true, error: "", rows: [] });

  const loadRequests = useCallback(
    () =>
      listOpenRequests()
        .then((rows) => setRequests({ loading: false, error: "", rows }))
        .catch((err) => setRequests((r) => ({ ...r, loading: false, error: err.message }))),
    []
  );
  const loadActivity = useCallback(
    () =>
      listActivity(14)
        .then((rows) => setActivity({ loading: false, error: "", rows }))
        .catch((err) => setActivity((a) => ({ ...a, loading: false, error: err.message }))),
    []
  );
  usePolling(loadRequests, REQUEST_POLL_MS);
  usePolling(loadActivity, ACTIVITY_POLL_MS);
  return { requests, activity, loadRequests, loadActivity };
}

/* ------------------------------------------------------------------ Modal shell */

function FeedWindow({ title, sub, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-feed-win" role="dialog" aria-modal="true" aria-labelledby="feed-title">
        <header className="adm-feed-win-hd">
          <div>
            <h2 id="feed-title">{title}</h2>
            {sub && <p className="db-sm">{sub}</p>}
          </div>
          <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="adm-feed-win-body">{children}</div>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

/* ------------------------------------------------------------------ Requests */

function RequestItem({ r, me, full = false, busy, onDoing, onFix }) {
  const Icon = KIND_ICON[r.kind] || MessageSquare;
  const doing = r.status === "in_progress";
  const mine = doing && r.claimed_by_id === me;
  const locked = doing && !mine;
  return (
    <li className={`adm-req ${doing ? "is-doing" : ""} ${locked ? "is-locked" : ""} ${full ? "is-full" : ""}`}>
      <span className="adm-req-icon" aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="adm-req-main">
        <div className="adm-req-title">
          <b>{requestKindLabel(r.kind)}</b>
          {r.subject && <span className="adm-req-about">{r.subject}</span>}
        </div>
        <p className="adm-req-details">{r.details}</p>
        <span className="db-sm">
          {r.teacher_name}
          {full && r.teacher_department ? ` · ${r.teacher_department}` : ""} · {full ? fullDate(r.created_at) : timeAgo(r.created_at)}
        </span>
        {doing && (
          <span className={`adm-req-who ${mine ? "is-me" : ""}`}>
            {locked ? <Lock size={12} aria-hidden="true" /> : <Wrench size={12} aria-hidden="true" />}
            {mine ? "You're working on this" : `${r.claimed_by_name || "Another admin"} is working on this`}
          </span>
        )}
      </div>
      <div className="adm-req-acts">
        <button
          type="button"
          className={`adm-req-btn adm-req-doing ${mine ? "on" : ""}`}
          onClick={() => onDoing(r)}
          disabled={busy || locked}
          aria-pressed={mine}
          title={locked ? `${r.claimed_by_name} is working on this` : mine ? "Stop working on this" : "I'm doing this"}
          aria-label={mine ? "Stop working on this request" : "Mark as doing"}
        >
          <Wrench size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="adm-req-btn adm-req-fix"
          onClick={() => onFix(r)}
          disabled={busy || locked}
          title={locked ? `${r.claimed_by_name} is working on this` : "Mark as fixed"}
          aria-label="Mark as fixed"
        >
          <Check size={16} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function RequestsCard({ feeds, delay = 0, preview = 3 }) {
  const { session } = useAuth();
  const { requests, loadRequests, loadActivity } = feeds;
  const [open, setOpen] = useState(false);
  const [fixing, setFixing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const act = async (id, fn) => {
    setBusyId(id);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      loadRequests();
    }
  };
  const onDoing = (r) =>
    act(r.id, () => (r.status === "in_progress" && r.claimed_by_id === session?.id ? releaseRequest(r.id) : claimRequest(r.id)));
  const confirmFix = () => {
    const r = fixing;
    setFixing(null);
    act(r.id, async () => {
      await resolveRequest(r.id);
      loadActivity();
    });
  };

  const rows = requests.rows;
  const list = (items, full) => (
    <ul className="adm-reqs">
      {items.map((r) => (
        <RequestItem key={r.id} r={r} me={session?.id} full={full} busy={busyId === r.id} onDoing={onDoing} onFix={setFixing} />
      ))}
    </ul>
  );

  return (
    <>
      <Card
        title={
          <span className="adm-feed-title">
            Requests from teachers {rows.length > 0 && <span className="adm-feed-count">{rows.length}</span>}
          </span>
        }
        sub="Stay here until fixed · press the spanner when you start on one"
        actions={
          rows.length > 0 && (
            <button type="button" className="adm-feed-more" onClick={() => setOpen(true)}>
              View more
            </button>
          )
        }
        delay={delay}
        className="adm-feed-card"
      >
        <div className="adm-feed-scroll">
          {error && <p className="adm-msg error">{error}</p>}
          {requests.loading ? (
            <p className="db-sm">Loading requests…</p>
          ) : requests.error ? (
            <p className="adm-msg error">{requests.error}</p>
          ) : rows.length ? (
            <>
              {list(rows.slice(0, preview), false)}
              {rows.length > preview && (
                <button type="button" className="adm-feed-rest" onClick={() => setOpen(true)}>
                  +{rows.length - preview} more request{rows.length - preview === 1 ? "" : "s"}
                </button>
              )}
            </>
          ) : (
            <Empty icon={Inbox} title="No open requests">
              Teachers send requests from their Settings → Requests.
            </Empty>
          )}
        </div>
      </Card>

      {open && (
        <FeedWindow title="Requests from teachers" sub={`${rows.length} open · oldest first`} onClose={() => setOpen(false)}>
          {rows.length ? list(rows, true) : <Empty icon={Inbox} title="No open requests" />}
          {error && <p className="adm-msg error">{error}</p>}
        </FeedWindow>
      )}

      {fixing && (
        <ConfirmDialog
          title="Mark this request as fixed?"
          tone="ok"
          icon={Check}
          confirmLabel="Yes, fixed"
          onConfirm={confirmFix}
          onClose={() => setFixing(null)}
        >
          {requestKindLabel(fixing.kind)}
          {fixing.subject ? ` · ${fixing.subject}` : ""} from {fixing.teacher_name}. It leaves this list, the teacher sees it
          as fixed and it's added to Recent activity.
        </ConfirmDialog>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Activity */

function ActivityItem({ e, full = false }) {
  const Icon = EVENT_ICON[e.kind] || Activity;
  return (
    <li className={`adm-act tone-${eventTone(e.kind) || "none"}`}>
      <span className="adm-list-icon" aria-hidden="true">
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="adm-list-main">
        <b title={e.title}>{e.title}</b>
        <span className="db-sm">
          {[e.detail, e.actor_name && `by ${e.actor_name}`].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="adm-act-when" title={fullDate(e.created_at)}>
        {full ? new Date(e.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : timeAgo(e.created_at)}
      </span>
    </li>
  );
}

function groupByDay(rows) {
  const groups = [];
  rows.forEach((e) => {
    const day = new Date(e.created_at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  });
  return groups;
}

export function ActivityCard({ feeds, delay = 0, preview = 6 }) {
  const { activity } = feeds;
  const [open, setOpen] = useState(false);
  const rows = activity.rows;
  return (
    <>
      <Card
        title="Recent activity"
        sub="Teachers, batches, subjects and students added or removed, and fixed requests · last 2 weeks"
        actions={
          rows.length > 0 && (
            <button type="button" className="adm-feed-more" onClick={() => setOpen(true)}>
              View more
            </button>
          )
        }
        delay={delay}
        className="adm-feed-card"
      >
        <div className="adm-feed-scroll">
          {activity.loading ? (
            <p className="db-sm">Loading activity…</p>
          ) : activity.error ? (
            <p className="adm-msg error">{activity.error}</p>
          ) : rows.length ? (
            <ul className="adm-list">
              {rows.slice(0, preview).map((e) => (
                <ActivityItem key={e.id} e={e} />
              ))}
            </ul>
          ) : (
            <Empty icon={Activity} title="Nothing changed in the last 2 weeks">
              New teachers, batches, subjects, students and fixed requests show up here.
            </Empty>
          )}
        </div>
      </Card>

      {open && (
        <FeedWindow title="Recent activity" sub={`${rows.length} change${rows.length === 1 ? "" : "s"} in the last 2 weeks`} onClose={() => setOpen(false)}>
          {groupByDay(rows).map((g) => (
            <section key={g.day} className="adm-act-day">
              <h3>{g.day}</h3>
              <ul className="adm-list">
                {g.items.map((e) => (
                  <ActivityItem key={e.id} e={e} full />
                ))}
              </ul>
            </section>
          ))}
        </FeedWindow>
      )}
    </>
  );
}
