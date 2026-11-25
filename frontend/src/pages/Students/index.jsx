// src/pages/Students/index.jsx — Students page: batch deck + selected student + status lanes (+ View all window).
// Roster and attendance come from the API for every class the signed-in teacher has.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, UserRound } from "lucide-react";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useSettings } from "../../context/settings/SettingsContext";
import { useClassroom } from "../../context/ClassroomContext";
import { listStudents } from "../../api/classrooms";
import { listLogs } from "../../api/attendance";
import { getLocalDateKey, makeSessionId } from "../../context/schedule/scheduleStatus";
import BatchDeck from "./BatchDeck";
import StudentDeck from "./StudentDeck";
import StatusLane from "./StatusLane";
import ViewAllModal from "./ViewAllModal";
import {
  BAND_ORDER,
  average,
  bandOf,
  buildBatches,
  buildStudents,
  buildSubjects,
  downloadStudentsCsv,
  lastSession,
  studentsInScope,
} from "./studentData";
import "./Directory.css";

// Roster + saved attendance of every class, from the API
function useRosterData(classrooms) {
  const [data, setData] = useState({ rosters: {}, logs: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const ids = classrooms.map((c) => c.id).join(",");

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    const classroomIds = ids ? ids.split(",").map(Number) : [];
    if (!classroomIds.length) {
      setData({ rosters: {}, logs: {} });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const pairs = await Promise.all(
        classroomIds.map(async (classroomId) => [classroomId, await Promise.all([listStudents(classroomId), listLogs(classroomId)])])
      );
      if (id !== requestId.current) return;
      const rosters = {};
      const logs = {};
      pairs.forEach(([classroomId, [roster, log]]) => {
        rosters[classroomId] = roster;
        logs[classroomId] = log;
      });
      setData({ rosters, logs });
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Could not load students.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [ids]);

  useEffect(() => {
    reload();
    return () => {
      requestId.current++;
    };
  }, [reload]);

  return { ...data, loading, error, reload };
}

function Students() {
  const navigate = useNavigate();
  const { attendanceThreshold: thr } = useSettings();
  const { classrooms, classroom: selectedClassroom, loading: classesLoading, error: classesError } = useClassroom();
  const { rosters, logs, loading, error, reload } = useRosterData(classrooms);

  const batches = useMemo(() => buildBatches(classrooms), [classrooms]);
  const subjects = useMemo(() => buildSubjects(batches), [batches]);
  const students = useMemo(() => buildStudents(batches, rosters, logs), [batches, rosters, logs]);

  // Selects hold "all", a course key or a batch index (as a string, like the <select> values)
  const [subject, setSubject] = useState("all");
  const [batch, setBatch] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);
  const [viewAllBand, setViewAllBand] = useState(null);

  // Start on the class selected elsewhere in the app (dashboard, attendance)
  const startedOn = useRef(null);
  useEffect(() => {
    if (!selectedClassroom || startedOn.current === selectedClassroom.id) return;
    startedOn.current = selectedClassroom.id;
    const index = batches.findIndex((b) => b.classroomId === selectedClassroom.id);
    if (index >= 0) {
      setBatch(String(index));
      setSubject(batches[index].courseKey);
    }
  }, [selectedClassroom, batches]);

  const scope = useMemo(() => studentsInScope(students, batches, subject, batch), [students, batches, subject, batch]);
  const lanes = useMemo(() => {
    const g = { er: [], wa: [], ok: [] };
    scope.forEach((r) => g[bandOf(r.pct, thr)].push(r));
    Object.values(g).forEach((list) => list.sort((a, b) => a.pct - b.pct || a.roll.localeCompare(b.roll, undefined, { numeric: true })));
    return g;
  }, [scope, thr]);

  // Keep the chosen student while they are in scope; otherwise pick the first (lowest) Critical student
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
  if (oneBatch != null && batches[oneBatch]) {
    const course = batches[oneBatch].courseKey;
    const sameCourse = students.filter((r) => batches[r.batchIndex].courseKey === course);
    delta = sameCourse.some((r) => r.batchIndex !== oneBatch) ? avg - average(sameCourse) : null;
    meta = `${scope.length} students · ${batches[oneBatch].name}`;
    last = lastSession(batches[oneBatch], logs);
  } else {
    const indexes = [...new Set(scope.map((r) => r.batchIndex))];
    meta = `${scope.length} students · ${indexes.length} class${indexes.length === 1 ? "" : "es"}`;
    weakest =
      indexes
        .map((i) => ({ index: i, group: batches[i].group, avg: average(scope.filter((r) => r.batchIndex === i)) }))
        .sort((a, b) => a.avg - b.avg)[0] || null;
  }

  const batchesOf = (value) => batches.filter((b) => value === "all" || b.courseKey === value);
  // Picking a subject selects its only batch if it has one; picking a batch also sets its subject
  const changeSubject = (value) => {
    const list = batchesOf(value);
    setSubject(value);
    setBatch(value === "all" ? "all" : list.length === 1 ? String(list[0].index) : "all");
  };
  const changeBatch = (value) => {
    setBatch(value);
    if (value !== "all") setSubject(batches[+value].courseKey);
  };
  const showAll = () => {
    setSubject("all");
    setBatch("all");
  };

  const openRecord = () => {
    const b = batches[oneBatch];
    if (b) navigate(`/attendance/${makeSessionId(`class-${b.classroomId}`, getLocalDateKey())}`);
  };

  const pickFromViewAll = (key) => {
    setSelectedKey(key);
    setViewAllBand(null);
    requestAnimationFrame(() => document.querySelector(".st-sc.on")?.scrollIntoView({ block: "nearest" }));
  };

  const subjectName = subjects.find((s) => s.key === subject)?.name || "All subjects";
  const context = `${subject === "all" ? "All subjects" : subjectName} · ${batch === "all" ? "All classes" : batches[+batch]?.group}`;

  const busy = classesLoading || loading;
  const problem = classesError || error;
  const noClasses = !busy && !problem && classrooms.length === 0;
  const noStudents = !busy && !problem && classrooms.length > 0 && students.length === 0;

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
                <p className="st-sub">Attendance standing for every student in your classes. The roster is managed by an administrator.</p>
              </div>
            </div>
            <button
              type="button"
              className="st-exp"
              disabled={!scope.length}
              onClick={() => downloadStudentsCsv(scope, thr, batch === "all" ? "all" : batches[+batch]?.group)}
            >
              <ArrowDownToLine size={15} strokeWidth={2} aria-hidden="true" />
              Export CSV
            </button>
          </div>

          {busy && students.length === 0 && (
            <p className="st-status" role="status">Loading students…</p>
          )}
          {problem && (
            <p className="st-status st-status-error" role="alert">
              {problem}{" "}
              <button type="button" className="st-lnk" onClick={reload}>Try again</button>
            </p>
          )}
          {noClasses && (
            <p className="st-status" role="status">
              No class yet. An admin creates a class and assigns it to a teacher; its students will show up here.
            </p>
          )}
          {noStudents && (
            <p className="st-status" role="status">
              No students in your classes yet. Ask an admin to add students to the section and enroll their faces.
            </p>
          )}

          <div className="st-tops">
            <BatchDeck
              thr={thr}
              avg={avg}
              delta={delta}
              meta={meta}
              subject={subject}
              batch={batch}
              subjects={subjects}
              batches={batches}
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
