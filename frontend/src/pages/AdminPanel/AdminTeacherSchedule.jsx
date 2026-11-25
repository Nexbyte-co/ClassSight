// Admin: a teacher's weekly timetable, shown the way the teacher sees it (/admin/teachers/:userId/schedule).
// The admin can drag slots to free periods (a lab takes two) and save all the moves at once.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Move, RotateCcw } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { listClassLectures, moveLectures, updateLecture } from "../../api/lectures";
import { buildTimetable } from "../../context/teacherModel";
import { DAYS, toClock, toMinutes } from "../../data/schedule/timeUtils";
import { ScheduleView } from "../Classes/ClassSchedule";
import "../Classes/ClassSchedule.css";

const apiWeekday = (day) => (DAYS.indexOf(day) + 6) % 7; // pages count Sunday as 0, the API Monday

function AdminTeacherSchedule() {
  const { userId } = useParams();
  const { classrooms, userById, loadedAt } = useAdminData();
  const teacher = userById.get(Number(userId));
  const mine = useMemo(() => classrooms.filter((c) => c.teacher_id === Number(userId)), [classrooms, userId]);
  const ids = mine.map((c) => c.id).join(",");
  const [byClass, setByClass] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moves, setMoves] = useState({}); // slot id -> { day, start, dur } not saved yet
  const [save, setSave] = useState({ busy: false, error: "", saved: false });

  useEffect(() => {
    let live = true;
    const list = ids ? ids.split(",").map(Number) : [];
    Promise.all(list.map(async (id) => [id, { lectures: await listClassLectures(id) }]))
      .then((rows) => live && (setByClass(Object.fromEntries(rows)), setError("")))
      .catch((err) => live && setError(err.message || "Could not load the timetable."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [ids]);

  const { slots, courses } = useMemo(() => buildTimetable(mine, byClass), [mine, byClass]);
  const draft = useMemo(() => slots.map((s) => (moves[s.id] ? { ...s, ...moves[s.id] } : s)), [slots, moves]);
  const movedIds = useMemo(() => new Set(Object.keys(moves)), [moves]);
  const count = movedIds.size;
  const name = teacher?.name ?? "Teacher";

  // Warn before leaving the page with moves not saved.
  useEffect(() => {
    if (!count) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [count]);

  const onMove = (slot, day, start, dur) => {
    const original = slots.find((s) => s.id === slot.id);
    setSave({ busy: false, error: "", saved: false });
    setMoves((m) => {
      const next = { ...m };
      if (original.day === day && toMinutes(original.start) === start && original.dur === dur) delete next[slot.id];
      else next[slot.id] = { day, start: toClock(start), dur };
      return next;
    });
  };

  const saveMoves = async () => {
    setSave({ busy: true, error: "", saved: false });
    try {
      const list = draft
        .filter((s) => moves[s.id])
        .map((s) => ({
          lectureId: s.lectureId,
          weekday: apiWeekday(s.day),
          startTime: s.start,
          endTime: toClock(toMinutes(s.start) + s.dur),
        }));
      const updated = await moveLectures(list);
      const byId = new Map(updated.map((l) => [l.id, l]));
      setByClass((m) =>
        Object.fromEntries(
          Object.entries(m).map(([cid, v]) => [cid, { ...v, lectures: v.lectures.map((l) => byId.get(l.id) ?? l) }])
        )
      );
      setMoves({});
      setSave({ busy: false, error: "", saved: true });
    } catch (err) {
      setSave({ busy: false, error: err.message || "Could not save the timetable.", saved: false });
    }
  };

  const cancel = () => {
    setMoves({});
    setSave({ busy: false, error: "", saved: false });
  };

  // Set a slot's venue; the timetable updates in place.
  const saveVenue = async (slot, room) => {
    const updated = await updateLecture(slot.classroomId, slot.lectureId, { room });
    setByClass((m) => ({
      ...m,
      [slot.classroomId]: { lectures: m[slot.classroomId].lectures.map((l) => (l.id === updated.id ? updated : l)) },
    }));
  };

  const panel = (
    <section className="sc-edit" aria-label="Timetable changes">
      <h4>
        <Move size={14} aria-hidden="true" /> Edit timetable
      </h4>
      <p className="sc-edit-hint">Drag a class onto a free period. Labs take two periods (100 min).</p>
      <p className={`sc-edit-state ${save.error ? "err" : save.saved && !count ? "ok" : ""}`} role="status">
        {save.error
          ? save.error
          : count
            ? `${count} unsaved ${count === 1 ? "change" : "changes"}`
            : save.saved
              ? "Saved · teacher and students see the new timetable"
              : "No changes"}
      </p>
      <div className="sc-edit-btns">
        <button type="button" className="sc-edit-cancel" onClick={cancel} disabled={!count || save.busy}>
          <RotateCcw size={14} aria-hidden="true" /> Cancel
        </button>
        <button type="button" className="sc-edit-save" onClick={saveMoves} disabled={!count || save.busy}>
          <Check size={15} aria-hidden="true" /> {save.busy ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );

  return (
    <div className="adm-detail adm-tch-schedule">
      <Link to="/admin/teachers" className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to Teachers
      </Link>
      <ScheduleView
        slots={draft}
        courses={courses}
        loading={loading || !loadedAt}
        error={error}
        title={`${name}'s schedule`}
        sub="Their weekly timetable across all batches · drag a slot to move it, click it to set its venue"
        onSaveVenue={saveVenue}
        edit={{ onMove, movedIds, panel }}
        emptyText="This teacher has no lectures, labs or tutorials scheduled yet. Add classes from Edit details."
      />
    </div>
  );
}

export default AdminTeacherSchedule;
