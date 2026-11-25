import { useMemo } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Info, ScanFace, TrendingUp } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, BarList, Card, StatTile, TrendChart } from "../../components/admin/ui";
import { num, pct, shortDate } from "../../components/admin/format";

function AdminAnalytics() {
  const { dailyTrend, sections, students, classrooms, analytics, totals, faceEnrolled, sessions } = useAdminData();

  const enrollment = useMemo(
    () =>
      [...sections]
        .sort((a, b) => b.student_count - a.student_count)
        .map((s) => {
          const roster = students.filter((st) => st.section_id === s.id);
          const enrolled = roster.filter((st) => st.face_enrolled).length;
          return {
            key: s.id,
            label: s.name,
            value: s.student_count,
            display: num(s.student_count),
            sub: `${enrolled} of ${roster.length} face-enrolled`,
          };
        }),
    [sections, students]
  );

  const classRates = useMemo(
    () =>
      classrooms
        .map((c) => ({ c, a: analytics[c.id] }))
        .filter(({ a }) => a && a.present_count + a.absent_count + a.excused_count > 0)
        .map(({ c, a }) => ({
          key: c.id,
          label: `${c.course_code || c.course} · ${c.section}`,
          value: a.average_attendance_rate,
          display: pct(a.average_attendance_rate),
          sub: `${a.present_count} present, ${a.absent_count} absent, ${a.excused_count} excused · ${a.total_sessions} sessions`,
        }))
        .sort((a, b) => b.value - a.value),
    [classrooms, analytics]
  );

  // Weekday pattern: attendance rate by day of week, over all sessions.
  const weekday = useMemo(() => {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const acc = names.map((n, i) => ({ key: i, label: n, present: 0, total: 0, sessions: 0 }));
    sessions.forEach((s) => {
      const [y, m, d] = s.date.split("-").map(Number);
      const i = (new Date(y, m - 1, d).getDay() + 6) % 7;
      acc[i].present += s.present;
      acc[i].total += s.total;
      acc[i].sessions += 1;
    });
    return acc
      .filter((r) => r.total > 0)
      .map((r) => ({
        ...r,
        value: r.present / r.total,
        display: pct(r.present / r.total),
        sub: `${r.present}/${r.total} present · ${r.sessions} sessions`,
      }));
  }, [sessions]);

  const first = dailyTrend[0];
  const last = dailyTrend[dailyTrend.length - 1];

  return (
    <>
      <AdminPageHeader title="Analytics" lead="Platform-wide statistics from recorded attendance and enrollment." />
      <AdminLoadState />

      <div className="adm-stats db-rise" style={{ animationDelay: "60ms" }}>
        <StatTile icon={ClipboardCheck} label="Overall attendance" value={pct(totals.rate, 1)} sub={`${num(totals.records)} records`} />
        <StatTile icon={TrendingUp} label="Days recorded" value={num(dailyTrend.length)} sub={first ? `${shortDate(first.date)} – ${shortDate(last.date)}` : "None yet"} />
        <StatTile icon={GraduationCap} label="Enrolled students" value={num(students.length)} sub={`across ${sections.length} sections`} />
        <StatTile icon={ScanFace} label="Face enrollment" value={students.length ? pct(faceEnrolled / students.length) : "—"} sub={`${num(faceEnrolled)} ready for AI attendance`} />
        <StatTile icon={BookOpen} label="Active classes" value={num(classRates.length)} sub={`of ${classrooms.length} have attendance`} />
      </div>

      <Card title="Attendance trend" sub="Share present per day across all classes" delay={100}>
        <TrendChart points={dailyTrend} height={240} ariaLabel="Daily attendance rate across all classes" />
      </Card>

      <div className="adm-grid">
        <Card title="Attendance by class" sub="Average share present, highest first" delay={140}>
          <BarList rows={classRates} max={1} ariaLabel="Attendance rate by class" emptyText="No class has recorded attendance yet." />
        </Card>
        <Card title="Attendance by weekday" sub="Share present on each day of the week" delay={180}>
          <BarList rows={weekday} max={1} ariaLabel="Attendance rate by weekday" emptyText="No sessions recorded yet." />
        </Card>
      </div>

      <div className="adm-grid">
        <Card title="Enrollment by section" sub="Students per section" delay={220}>
          <BarList rows={enrollment} ariaLabel="Students per section" emptyText="No sections yet." />
        </Card>
        <Card title="Academic performance" delay={260}>
          <p className="adm-note">
            <Info size={15} aria-hidden="true" /> ClassSight doesn't record grades or marks yet, so there's no academic
            performance data to show. Attendance is the only performance signal tracked today.
          </p>
        </Card>
      </div>
    </>
  );
}

export default AdminAnalytics;
