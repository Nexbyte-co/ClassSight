import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  GraduationCap,
  Layers,
  ScanFace,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "../../context/AdminDataContext";
import { listSchedule } from "../../api/lectures";
import { AdminLoadState, AdminPageHeader, BarList, Card, Empty, StatTile } from "../../components/admin/ui";
import { hhmm, num, pct, shortDate, todayWeekday, WEEKDAYS } from "../../components/admin/format";

const QUICK_ACTIONS = [
  { to: "/admin/users", Icon: UserPlus, label: "Add a user", sub: "Teacher or administrator account" },
  { to: "/admin/setup", Icon: BookOpen, label: "Set up a class", sub: "Create a class and its lecture times" },
  { to: "/admin/classes", Icon: Layers, label: "Manage sections", sub: "Sections and their student rosters" },
  { to: "/admin/attendance", Icon: ClipboardCheck, label: "Attendance reports", sub: "Summaries and CSV downloads" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function TodaySchedule() {
  const [state, setState] = useState({ loading: true, error: "", lectures: [] });
  useEffect(() => {
    let cancelled = false;
    listSchedule(todayWeekday())
      .then((lectures) => !cancelled && setState({ loading: false, error: "", lectures }))
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, lectures: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <p className="db-sm">Loading today's lectures…</p>;
  if (state.error) return <p className="adm-msg error">{state.error}</p>;
  if (!state.lectures.length)
    return (
      <Empty icon={CalendarRange} title={`No lectures on ${WEEKDAYS[todayWeekday()]}`}>
        Lecture times are added per class in the class setup.
      </Empty>
    );
  return (
    <ul className="adm-list">
      {state.lectures.map((l) => (
        <li key={l.id}>
          <span className="adm-list-time">
            {hhmm(l.start_time)}–{hhmm(l.end_time)}
          </span>
          <span className="adm-list-main">
            <b>{l.course}</b>
            <span className="db-sm">
              {[l.course_code, l.section, l.room].filter(Boolean).join(" · ")}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function AdminDashboard() {
  const { session } = useAuth();
  const {
    teachers,
    admins,
    classrooms,
    sections,
    students,
    totals,
    sessions,
    faceEnrolled,
    classroomById,
    analytics,
  } = useAdminData();

  const recent = sessions.slice(0, 6);
  const classRates = classrooms
    .map((c) => ({ c, a: analytics[c.id] }))
    .filter(({ a }) => a && a.present_count + a.absent_count + a.excused_count > 0)
    .map(({ c, a }) => {
      const total = a.present_count + a.absent_count + a.excused_count;
      return {
        key: c.id,
        label: `${c.course} · ${c.section}`,
        value: a.average_attendance_rate,
        display: pct(a.average_attendance_rate),
        sub: `${a.present_count}/${total} present across ${a.total_sessions} session${a.total_sessions === 1 ? "" : "s"}`,
      };
    })
    .sort((a, b) => a.value - b.value)
    .slice(0, 6);

  return (
    <div className="adm-fit">
      <AdminPageHeader
        title={`${greeting()}, ${(session?.name || "Admin").split(" ")[0]}`}
        lead="Here's an overview of ClassSight across all classes and users."
      />
      <AdminLoadState />

      <div className="adm-stats db-rise" style={{ animationDelay: "60ms" }}>
        <StatTile icon={GraduationCap} label="Students" value={num(students.length)} sub={`${sections.length} section${sections.length === 1 ? "" : "s"}`} />
        <StatTile icon={Users} label="Teachers" value={num(teachers.length)} sub={`${admins.length} administrator${admins.length === 1 ? "" : "s"}`} />
        <StatTile icon={BookOpen} label="Classes" value={num(classrooms.length)} sub={`${num(totals.sessions)} attendance sessions`} />
        <StatTile
          icon={ClipboardCheck}
          label="Avg. attendance"
          value={pct(totals.rate)}
          sub={totals.records ? `${num(totals.records)} records` : "No records yet"}
          tone={totals.rate === null ? undefined : totals.rate >= 0.75 ? "good" : totals.rate >= 0.6 ? "warn" : "bad"}
        />
        <StatTile
          icon={ScanFace}
          label="Face enrolled"
          value={students.length ? pct(faceEnrolled / students.length) : "—"}
          sub={`${num(faceEnrolled)} of ${num(students.length)} students`}
        />
      </div>

      <div className="adm-grid adm-fill">
        <Card
          title="Recent activity"
          sub="Latest attendance sessions"
          delay={100}
          actions={
            <Link to="/admin/attendance" className="adm-link">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          {recent.length ? (
            <ul className="adm-list">
              {recent.map((s) => {
                const c = classroomById.get(s.classroomId);
                return (
                  <li key={s.id}>
                    <span className="adm-list-icon" aria-hidden="true">
                      <Activity size={15} strokeWidth={2} />
                    </span>
                    <span className="adm-list-main">
                      <b>{c ? `${c.course} · ${c.section}` : `Class #${s.classroomId}`}</b>
                      <span className="db-sm">
                        {shortDate(s.date)} · {s.total ? `${s.present}/${s.total} present (${pct(s.rate)})` : "Not confirmed yet"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={Activity} title="No activity yet">
              Sessions appear here once teachers take attendance.
            </Empty>
          )}
        </Card>

        <Card title={`Today · ${WEEKDAYS[todayWeekday()]}`} sub="Scheduled lectures" delay={140}>
          <TodaySchedule />
        </Card>
      </div>

      <div className="adm-grid adm-fill">
        <Card title="Lowest attendance" sub="Classes with recorded attendance, lowest first" delay={180}>
          <BarList rows={classRates} max={1} ariaLabel="Attendance rate by class" emptyText="No class has recorded attendance yet." />
        </Card>
        <Card title="Quick actions" delay={220}>
          <div className="adm-actions">
            {QUICK_ACTIONS.map(({ to, Icon, label, sub }) => (
              <Link key={to} to={to} className="adm-action">
                <span className="adm-action-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span>
                  <b>{label}</b>
                  <span className="db-sm">{sub}</span>
                </span>
                <ArrowRight size={16} className="adm-action-go" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

export default AdminDashboard;
