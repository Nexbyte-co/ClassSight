// src/pages/Reports/index.jsx — attendance analytics (batch stats, trend, date range, low-attendance list)
import { useMemo, useState } from "react";
import TeacherShell from "../../components/navigation/TeacherShell";
import { Icon } from "./icons";
import KpiRow from "./KpiRow";
import BatchSelectedCard from "./BatchSelectedCard";
import AttendanceTrendCard from "./AttendanceTrendCard";
import MonthCalendar from "./MonthCalendar";
import LowestAttendanceCard from "./LowestAttendanceCard";
import LowestAttendanceModal from "./LowestAttendanceModal";
import WeeklyBreakdownCard from "./WeeklyBreakdownCard";
import {
  BATCHES,
  SEMESTER_START,
  SEMESTER_END,
  batchesOfSubject,
  downloadStudentCsv,
  lowAttendance,
  rangeFileTag,
  studentRows,
} from "./reportsMock";
import "./Reports.css";

function Reports() {
  const [subject, setSubject] = useState(0);
  const [batchIndex, setBatchIndex] = useState(batchesOfSubject(0)[0].index);
  const [allMode, setAllMode] = useState(false);
  const [range, setRange] = useState({ from: SEMESTER_START, to: SEMESTER_END });
  const [anchor, setAnchor] = useState(null);
  const [month, setMonth] = useState(() => {
    const end = new Date(SEMESTER_END);
    return new Date(end.getFullYear(), end.getMonth(), 1);
  });
  const [query, setQuery] = useState("");
  const [showAllLow, setShowAllLow] = useState(false);

  const { from, to } = range;
  const setClampedRange = (a, b) =>
    setRange({ from: Math.max(SEMESTER_START, Math.min(a, b)), to: Math.min(SEMESTER_END, Math.max(a, b)) });

  const rows = useMemo(() => studentRows(batchIndex, allMode, from, to), [batchIndex, allMode, from, to]);
  const lowStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lowAttendance(rows).filter((r) => !q || r.name.toLowerCase().includes(q) || r.roll.includes(q));
  }, [rows, query]);

  const fileBatch = allMode ? "all-batches" : BATCHES[batchIndex].group;

  return (
    <TeacherShell
      active="reports"
      overlays={
        showAllLow && (
          <LowestAttendanceModal
            students={lowAttendance(rows)}
            batchIndex={batchIndex}
            allMode={allMode}
            from={from}
            to={to}
            onExport={(list) => downloadStudentCsv(list, `lowest-attendance-${fileBatch}.csv`)}
            onClose={() => setShowAllLow(false)}
          />
        )
      }
    >
      <main className="db-main">
        <div className="rp-page">
          <div className="rp-top">
            <div className="rp-hd">
              <div className="rp-hico"><Icon name="chartBars" size={26} strokeWidth={1.8} /></div>
              <div>
                <h1 className="rp-title">Reports</h1>
                <p className="rp-sub">Attendance analytics and exports across your classes</p>
              </div>
            </div>
            <KpiRow />
            <BatchSelectedCard
              subject={subject}
              batchIndex={batchIndex}
              allMode={allMode}
              from={from}
              to={to}
              onSubjectChange={(s) => {
                setSubject(s);
                setBatchIndex(batchesOfSubject(s)[0].index);
                setAllMode(false);
              }}
              onBatchChange={(b) => {
                setBatchIndex(b);
                setAllMode(false);
              }}
              onToggleAll={() => setAllMode((v) => !v)}
            />
          </div>

          <div className="rp-grid">
            <AttendanceTrendCard
              batchIndex={batchIndex}
              allMode={allMode}
              from={from}
              to={to}
              onExport={() => downloadStudentCsv(rows, `attendance-${fileBatch}-${rangeFileTag(from, to)}.csv`)}
            />
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              from={from}
              to={to}
              anchor={anchor}
              onPick={(t) => {
                if (anchor === null) {
                  setAnchor(t);
                  setClampedRange(t, t);
                } else {
                  setAnchor(null);
                  setClampedRange(anchor, t);
                }
              }}
              onReset={() => {
                setAnchor(null);
                setClampedRange(SEMESTER_START, SEMESTER_END);
              }}
            />
            <WeeklyBreakdownCard batchIndex={batchIndex} allMode={allMode} from={from} to={to} />
          </div>

          <LowestAttendanceCard
            batchIndex={batchIndex}
            allMode={allMode}
            from={from}
            to={to}
            students={lowStudents}
            query={query}
            onQueryChange={setQuery}
            onExport={() => downloadStudentCsv(lowAttendance(rows), `lowest-attendance-${fileBatch}.csv`)}
            onViewMore={() => setShowAllLow(true)}
          />
        </div>
      </main>
    </TeacherShell>
  );
}

export default Reports;
