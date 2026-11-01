// Verify one student: capture a photo, the server says which enrolled student it is (or not).
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, HelpCircle, ScanFace } from "lucide-react";
import PageShell from "../components/PageShell";
import CameraCapture from "../components/CameraCapture";
import { useClassroom } from "../context/ClassroomContext";
import { verifyPhoto } from "../api/classrooms";
import { ENROLL_MAX_SIDE, resizeImage } from "../lib/resizeImage";

// What the teacher reads for each non-match reason from POST /classrooms/{id}/verify.
const NO_MATCH_TEXT = {
  below_threshold: "Not recognised: this face does not match any enrolled student closely enough.",
  ambiguous: "Not sure: this face is close to more than one student. Retake the photo with better light, facing the camera.",
  no_enrolled_students: "Nobody in this class has an enrolled face yet. Enroll students on the Students page first.",
};

function Verify() {
  const { classroom } = useClassroom();
  const [cameraOn, setCameraOn] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const requestId = useRef(0);

  const reset = () => {
    requestId.current++; // drop any answer still on its way
    setPhoto(null);
    setResult(null);
    setError("");
    setBusy(false);
  };

  // A different class has different students: forget the previous photo and result.
  const classroomId = classroom?.id;
  useEffect(() => {
    requestId.current++;
    setCameraOn(false);
    setPhoto(null);
    setResult(null);
    setError("");
    setBusy(false);
  }, [classroomId]);

  const check = async (file) => {
    const id = ++requestId.current;
    setCameraOn(false);
    setPhoto(file);
    setResult(null);
    setError("");
    setBusy(true);
    try {
      const small = await resizeImage(file, ENROLL_MAX_SIDE);
      const answer = await verifyPhoto(classroom.id, small);
      if (id === requestId.current) setResult(answer);
    } catch (err) {
      if (id !== requestId.current) return;
      // 422 = no face / several faces / unreadable photo: a retake prompt, not a failure of the system
      setError(
        err.status === 422
          ? `${err.message}. Retake the photo with one person, face clearly visible.`
          : err.message || "Verification failed."
      );
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  return (
    <PageShell crumb="Verify" activePage="verify">
      <div className="students-page-header">
        <div>
          <h1 className="students-page-title">Verify a student</h1>
          <p className="students-page-subtitle">
            {classroom
              ? `Take a photo of one student. ClassSight checks it against the enrolled students of ${classroom.course} - ${classroom.section}. The photo is not stored.`
              : "No class is available yet."}
          </p>
        </div>
      </div>

      {classroom && (
        <div className="mg-card">
          {!photo && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="mg-btn" onClick={() => setCameraOn((on) => !on)}>
                <ScanFace size={16} style={{ verticalAlign: "-3px" }} /> {cameraOn ? "Close camera" : "Open camera"}
              </button>
              <label className="mg-btn secondary mg-file">
                Choose a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    e.target.value = "";
                    if (file) check(file);
                  }}
                />
              </label>
            </div>
          )}

          {cameraOn && !photo && (
            <div style={{ marginTop: 14 }}>
              <CameraCapture label="Capture and verify" facingMode="environment" onCapture={check} />
            </div>
          )}

          {photo && (
            <div className="mg-camera" style={{ marginTop: 4 }}>
              <img src={previewUrl} alt="Captured photo" style={{ maxWidth: 360 }} />
            </div>
          )}

          {/* Always mounted so screen readers announce what appears inside it */}
          <div aria-live="polite">
          {busy && <p className="mg-hint" style={{ marginTop: 12 }}>Checking...</p>}

          {error && <div className="mg-alert error">{error}</div>}

          {result && result.verified && result.student && (
            <div className="mg-result match">
              <CheckCircle2 size={34} color="var(--cs-success, #16a34a)" />
              <div>
                <strong style={{ fontSize: 18 }}>{result.student.name}</strong>
                <div className="mg-hint" style={{ margin: 0 }}>
                  Roll number {result.student.roll_number} · confidence {Math.round(result.confidence * 100)}%
                </div>
              </div>
            </div>
          )}

          {result && !result.verified && (
            <div className="mg-result nomatch">
              <HelpCircle size={34} color="var(--cs-warning, #b45309)" />
              <div>{NO_MATCH_TEXT[result.reason] || "Not recognised."}</div>
            </div>
          )}
          </div>

          {photo && !busy && (
            <div className="mg-modal-foot" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="mg-btn" onClick={reset}>
                Verify another student
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

export default Verify;
