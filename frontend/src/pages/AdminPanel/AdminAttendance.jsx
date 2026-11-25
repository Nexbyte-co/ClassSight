import { useMemo, useState } from "react";
import { ClipboardCheck, Download, FileSpreadsheet } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty, RateChip, Tabs } from "../../components/admin/ui";
import { downloadCsv, num, pct, shortDate, teacherName } from "../../components/admin/format";

const today = () => new Date().toISOString().slice(0, 10);

function useClassRows() {
  const { classrooms, analytics, userById } = useAdminData();
  return useMemo(
    () =>
      classrooms.map((c) => {
        const a = analytics[c.id];
        const records = a ? a.present_count + a.absent_count + a.excused_count : 0;
        return {
          id: c.id,
          label: `${c.course} · ${c.section}`,
          course: c.course,
          code: c.course_code,
          section: c.section,
          teacher: teacherName(userById, c.teacher_id),
          sessions: a?.total_sessions ?? 0,
          students: a?.total_students ?? 0,
          present: a?.present_count ?? 0,
          absent: a?.absent_count ?? 0,
          excused: a?.excused_count ?? 0,
          rate: records ? a.average_attendance_rate : null,
        };
      }),
    [classrooms, analytics, userById]
  );
}

function ClassDetail({ classId }) {
  const { classroomById, sessions, sections, students } = useAdminData();
  const [view, setView] = useState("sessions");
  const c = classroomById.get(classId);
  const classSessions = sessions.filter((s) => s.classroomId === classId);

  // Per-student report: students of the class's section, counted over its confirmed sessions.
  const studentReport = useMemo(() => {
    if (!c) return [];
    const section = sections.find((s) => s.name === c.section);
    const roster = section ? students.filter((s) => s.section_id === section.id) : [];
    const counts = new Map(roster.map((s) => [s.id, { present: 0, absent: 0, excused: 0 }]));
    classSessions.forEach((sess) =>
      sess.records.forEach((r) => {
        const row = counts.get(r.student_id);
        if (row && r.status in row) row[r.status] += 1;
      })
    );
    return roster
      .map((s) => {
        const k = counts.get(s.id);
        const total = k.present + k.absent + k.excused;
        return { ...s, ...k, total, rate: total ? k.present / total : null };
      })
      .sort((a, b) => (a.rate ?? 2) - (b.rate ?? 2));
  }, [c, sections, students, classSessions]);

  if (!c) return null;
  const slug = `${(c.course_code || c.course).replace(/\W+/g, "-")}-${c.section}`;

  return (
    <Card
      title={`${c.course} · ${c.section}`}
      sub={[c.course_code, c.department].filter(Boolean).join(" · ") || "Class detail"}
      delay={40}
      actions={
        view === "sessions" ? (
          <button
            type="button"
            className="db-btn"
            disabled={!classSessions.length}
            onClick={() =>
              downloadCsv(`attendance-sessions-${slug}-${today()}.csv`, [
                ["Date", (r) => r.date],
                ["Present", (r) => r.present],
                ["Absent", (r) => r.absent],
                ["Excused", (r) => r.excused],
                ["Recorded", (r) => r.total],
                ["Attendance %", (r) => (r.rate === null ? "" : (r.rate * 100).toFixed(1))],
              ], classSessions)
            }
          >
            <Download size={15} aria-hidden="true" /> Sessions CSV
          </button>
        ) : (
          <button
            type="button"
            className="db-btn"
            disabled={!studentReport.length}
            onClick={() =>
              downloadCsv(`student-attendance-${slug}-${today()}.csv`, [
                ["Roll no.", (r) => r.roll_number],
                ["Name", (r) => r.name],
                ["Present", (r) => r.present],
                ["Absent", (r) => r.absent],
                ["Excused", (r) => r.excused],
                ["Sessions recorded", (r) => r.total],
                ["Attendance %", (r) => (r.rate === null ? "" : (r.rate * 100).toFixed(1))],
              ], studentReport)
            }
          >
            <Download size={15} aria-hidden="true" /> Student report CSV
          </button>
        )
      }
    >
      <Tabs
        tabs={[
          { key: "sessions", label: "Attendance records", count: classSessions.length },
          { key: "students", label: "Student report", count: studentReport.length },
        ]}
        value={view}
        onChange={setView}
        label="Class report view"
      />
      {view === "sessions" ? (
        classSessions.length ? (
          <div className="adm-table-wrap adm-table-short">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="adm-num">Present</th>
                  <th className="adm-num">Absent</th>
                  <th className="adm-num">Excused</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {classSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{shortDate(s.date, { year: true })}</td>
                    <td className="adm-num">{s.present}</td>
                    <td className="adm-num">{s.absent}</td>
                    <td className="adm-num">{s.excused}</td>
                    <td>{s.total ? <RateChip value={s.rate} /> : <span className="adm-chip">Not confirmed</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={ClipboardCheck} title="No sessions for this class yet" />
        )
      ) : studentReport.length ? (
        <div className="adm-table-wrap adm-table-short">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Roll no.</th>
                <th>Name</th>
                <th className="adm-num">Present</th>
                <th className="adm-num">Absent</th>
                <th className="adm-num">Excused</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {studentReport.map((s) => (
                <tr key={s.id}>
                  <td className="adm-mono">{s.roll_number}</td>
                  <td>{s.name}</td>
                  <td className="adm-num">{s.present}</td>
                  <td className="adm-num">{s.absent}</td>
                  <td className="adm-num">{s.excused}</td>
                  <td>
                    <RateChip value={s.rate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={ClipboardCheck} title="No students in this class's section" />
      )}
    </Card>
  );
}

function AdminAttendance() {
  const { totals } = useAdminData();
  const rows = useClassRows();
  const [selected, setSelected] = useState(null);
  const current = rows.find((r) => r.id === selected) ? selected : rows[0]?.id ?? null;

  return (
    <>
      <AdminPageHeader
        title="Attendance & Reports"
        lead={`${num(totals.sessions)} sessions · ${num(totals.records)} attendance records · ${pct(totals.rate)} present overall`}
        actions={
          <button
            type="button"
            className="db-btn"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`attendance-summary-${today()}.csv`, [
                ["Course", (r) => r.course],
                ["Code", (r) => r.code],
                ["Section", (r) => r.section],
                ["Teacher", (r) => r.teacher],
                ["Students", (r) => r.students],
                ["Sessions", (r) => r.sessions],
                ["Present", (r) => r.present],
                ["Absent", (r) => r.absent],
                ["Excused", (r) => r.excused],
                ["Attendance %", (r) => (r.rate === null ? "" : (r.rate * 100).toFixed(1))],
              ], rows)
            }
          >
            <FileSpreadsheet size={15} aria-hidden="true" /> Download summary
          </button>
        }
      />
      <AdminLoadState />

      <Card title="Attendance summary" sub="Every class. Select one for its records and student report." delay={40}>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table adm-table-select">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th className="adm-num">Students</th>
                  <th className="adm-num">Sessions</th>
                  <th className="adm-num">Present</th>
                  <th className="adm-num">Absent</th>
                  <th className="adm-num">Excused</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === current ? "on" : ""}
                    onClick={() => setSelected(r.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(r.id))}
                    tabIndex={0}
                    aria-selected={r.id === current}
                  >
                    <td>
                      <b>{r.course}</b> <span className="db-sm">· {r.section}</span>
                    </td>
                    <td>{r.teacher}</td>
                    <td className="adm-num">{r.students}</td>
                    <td className="adm-num">{r.sessions}</td>
                    <td className="adm-num">{r.present}</td>
                    <td className="adm-num">{r.absent}</td>
                    <td className="adm-num">{r.excused}</td>
                    <td>
                      <RateChip value={r.rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={ClipboardCheck} title="No classes yet">
            Reports appear once classes exist and teachers take attendance.
          </Empty>
        )}
      </Card>

      {current !== null && <ClassDetail key={current} classId={current} />}
    </>
  );
}

export default AdminAttendance;
