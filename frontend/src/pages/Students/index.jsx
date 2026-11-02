// src/pages/Students/index.jsx — Students page: batch deck + selected student + status lanes (+ View all window).
// Built from the design handoff in ClassSight-Students-Handoff/ (SPEC.md). Data is mock (studentsMock.js).
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, UserRound } from "lucide-react";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useSettings } from "../../context/settings/SettingsContext";
import { SLOTS } from "../../data/schedule/timetable";
import BatchDeck from "./BatchDeck";
import StudentDeck from "./StudentDeck";
import StatusLane from "./StatusLane";
import ViewAllModal from "./ViewAllModal";
import {
  BAND_ORDER,
  BATCHES,
  DEFAULT_BATCH,
  STUDENTS,
  SUBJECTS,
  average,
  bandOf,
  downloadStudentsCsv,
  lastLab,
  studentsInScope,
} from "./studentsMock";
import "./Directory.css";

const batchesOf = (subject) => BATCHES.filter((b) => subject === "all" || b.courseIndex === +subject);

function Students() {
  const navigate = useNavigate();
  const { attendanceThreshold: thr } = useSettings();
  // Selects hold "all" or an index (as a string, like the <select> values)
  const [subject, setSubject] = useState(String(BATCHES[DEFAULT_BATCH].courseIndex));
  const [batch, setBatch] = useState(String(DEFAULT_BATCH));
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewAllBand, setViewAllBand] = useState(null);

  const scope = useMemo(() => studentsInScope(subject, batch), [subject, batch]);
  const lanes = useMemo(() => {
    const g = { er: [], wa: [], ok: [] };
    scope.forEach((r) => g[bandOf(r.pct, thr)].push(r));
    Object.values(g).forEach((list) => list.sort((a, b) => a.pct - b.pct || a.roll.localeCompare(b.roll)));
    return g;
  }, [scope, thr]);

  // Keep the chosen student while they are in scope; otherwise pick the first (lowest) Critical student
  // and remember that pick, so widening the scope later (e.g. All students) keeps them selected
  const selected = scope.find((r) => r.key === selectedKey) || lanes.er[0] || lanes.wa[0] || lanes.ok[0] || null;
  if ((selected?.key ?? null) !== selectedKey) setSelectedKey(selected?.key ?? null);

  const oneBatch = batch !== "all" ? +batch : null;
  const allActive = subject === "all" && batch === "all";
  const avg = average(scope);
  const counts = { er: lanes.er.length, wa: lanes.wa.length, ok: lanes.ok.length };

  let delta = null;
  let meta;
  let last = null;
  let weakest = null;
  if (oneBatch != null) {
    const course = BATCHES[oneBatch].courseIndex;
    delta = avg - average(STUDENTS.filter((r) => BATCHES[r.batchIndex].courseIndex === course));
    meta = `${scope.length} students · ${SLOTS[oneBatch].day} ${SLOTS[oneBatch].start}`;
    last = lastLab(oneBatch);
  } else {
    const indexes = [...new Set(scope.map((r) => r.batchIndex))];
    meta = `${scope.length} students · ${indexes.length} batches`;
    weakest =
      indexes
        .map((i) => ({ index: i, group: BATCHES[i].group, avg: average(scope.filter((r) => r.batchIndex === i)) }))
        .sort((a, b) => a.avg - b.avg)[0] || null;
  }

  // Picking a subject selects its only batch if it has one; picking a batch also sets its subject
  const changeSubject = (value) => {
    const list = batchesOf(value);
    setSubject(value);
    setBatch(value === "all" ? "all" : list.length === 1 ? String(list[0].index) : "all");
  };
  const changeBatch = (value) => {
    setBatch(value);
    if (value !== "all") setSubject(String(BATCHES[+value].courseIndex));
  };
  const showAll = () => {
    setSubject("all");
    setBatch("all");
  };

  const openRecord = () => {
    const b = BATCHES[oneBatch];
    navigate(`/reports/details?mode=total&course=${encodeURIComponent(b.name)}&section=${encodeURIComponent(b.group)}`);
  };

  const pickFromViewAll = (key) => {
    setSelectedKey(key);
    setViewAllBand(null);
    requestAnimationFrame(() => document.querySelector(".st-sc.on")?.scrollIntoView({ block: "nearest" }));
  };

  const context = `${subject === "all" ? "All subjects" : SUBJECTS[+subject].name} · ${batch === "all" ? "All batches" : BATCHES[+batch].group}`;

  return (
    <TeacherShell
      active="students"
      rootClassName="st-root"
      overlays={
        viewAllBand && (
          <ViewAllModal
            band={viewAllBand}
            students={scope}
            thr={thr}
            context={context}
            onClose={() => setViewAllBand(null)}
            onPick={pickFromViewAll}
          />
        )
      }
    >
      <main className="db-main">
        <div className="st-view">
          <div className="st-hd">
            <div className="st-hl">
              <div className="st-hico">
                <UserRound size={26} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div>
                <h1 className="st-title">Students</h1>
                <p className="st-sub">Attendance standing for every student in your batches</p>
              </div>
            </div>
            <button
              type="button"
              className="st-exp"
              onClick={() => downloadStudentsCsv(scope, thr, batch === "all" ? "all" : BATCHES[+batch].group)}
            >
              <ArrowDownToLine size={15} strokeWidth={2} aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="st-tops">
            <BatchDeck
              thr={thr}
              avg={avg}
              delta={delta}
              meta={meta}
              subject={subject}
              batch={batch}
              allActive={allActive}
              counts={counts}
              total={scope.length}
              last={last}
              weakest={weakest}
              onSubject={changeSubject}
              onBatch={changeBatch}
              onAll={showAll}
              onOpenRecord={openRecord}
              onShowBatch={(i) => changeBatch(String(i))}
            />
            {/* keyed by student so the day strip starts on the latest days for each one */}
            <StudentDeck key={selected?.key ?? "none"} student={selected} thr={thr} />
          </div>

          <div className="st-lanes">
            {BAND_ORDER.map((band) => (
              <StatusLane
                key={band}
                band={band}
                students={lanes[band]}
                thr={thr}
                selectedKey={selected?.key}
                onSelect={setSelectedKey}
                onViewAll={setViewAllBand}
              />
            ))}
          </div>
        </div>
      </main>
    </TeacherShell>
  );
}

export default Students;
