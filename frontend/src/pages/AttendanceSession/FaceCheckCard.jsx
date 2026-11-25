// src/pages/AttendanceSession/FaceCheckCard.jsx — the two photo boxes inside the "Student under review"
// card: the face cut out of today's class photo (when the scan thought it might be this student) and the
// student's enrolled photo. Both boxes always show; an empty one says why.
import { useEffect, useState } from "react";
import { Check, ImageOff, UserRound, X } from "lucide-react";
import { getStudentPhoto } from "../../api/classrooms";

export default function StudentPhotos({ row, classroomId, saved, locked, onYes }) {
  const [state, setState] = useState({ key: null, url: "", error: "" });
  const [dismissed, setDismissed] = useState(null); // student whose "is this …?" was answered No
  const key = `${classroomId}:${row.j}`;

  useEffect(() => {
    if (!row.faceEnrolled) return undefined;
    let live = true;
    getStudentPhoto(classroomId, row.j)
      .then((r) => live && setState({ key, url: r.url, error: "" }))
      .catch((err) => live && setState({ key, url: "", error: err.message || "Could not load the photo." }));
    return () => {
      live = false;
    };
  }, [row.j, row.faceEnrolled, classroomId, key]);

  const first = row.name.split(" ")[0];
  const mine = state.key === key;
  const enrolledUrl = row.faceEnrolled && mine ? state.url : "";
  const asking = Boolean(row.suggest) && dismissed !== row.j;
  const notes = [];
  if (!row.suggest) notes.push("No face in today's class photo was close enough to suggest for this student.");
  if (!row.faceEnrolled) notes.push("No enrolled photo yet. Ask an admin to enroll this student, or mark them manually.");
  else if (mine && state.error) notes.push(state.error);

  return (
    <div className="as-sp">
      <div className="as-sp-boxes">
        <figure>
          {row.suggest ? (
            <img src={row.suggest.crop} alt={`Face from the class photo that may be ${row.name}`} />
          ) : (
            <div className="as-sp-empty" aria-hidden="true"><ImageOff size={26} strokeWidth={1.6} /></div>
          )}
          <figcaption>
            <b>Live</b>
            <span>Cropped from today&apos;s class photo</span>
            {row.suggest && <em>{Math.round(row.suggest.confidence * 100)}% similar</em>}
          </figcaption>
        </figure>
        <figure>
          {enrolledUrl ? (
            <img src={enrolledUrl} alt={`${row.name}, enrolled photo`} />
          ) : (
            <div className="as-sp-empty" aria-hidden="true">
              {row.faceEnrolled && !(mine && state.error) ? <span className="as-spin" /> : <UserRound size={26} strokeWidth={1.6} />}
            </div>
          )}
          <figcaption>
            <b>Enrolled</b>
            <span>Saved by an admin</span>
          </figcaption>
        </figure>
      </div>
      {asking && (
        <div className="as-ask-btns">
          <span className="as-ask-q">Is this {first}?</span>
          <button type="button" className="as-b1 yes" disabled={saved || locked} onClick={() => onYes(row, row.suggest.confidence)}>
            <Check size={15} strokeWidth={2.6} aria-hidden="true" />
            Yes
          </button>
          <button type="button" className="as-b1" onClick={() => setDismissed(row.j)}>
            <X size={15} strokeWidth={2.6} aria-hidden="true" />
            No
          </button>
        </div>
      )}
      {notes.map((n) => (
        <p key={n} className="as-sp-note">{n}</p>
      ))}
    </div>
  );
}
