// Admin-only face enrollment: enroll / re-enroll a student's face from 1-5 photos, and the
// student profile (enrollment photos, delete face data). Uses the section endpoints.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Modal from "../Modal";
import CameraCapture from "../CameraCapture";
import { deleteSectionFace, enrollSectionFace, getSectionStudent } from "../../api/sections";
import { ENROLL_MAX_SIDE, resizeImage } from "../../lib/resizeImage";
import { useTheme } from "../../context/theme/ThemeContext";
import "../../pages/Students/Students.css";
import "../../pages/Manage.css";

const MAX_PHOTOS = 5;

// The modal styles read the --cs-* tokens that Students.css defines on .students-page-root
function Tokens({ children }) {
  const { isDarkMode } = useTheme();
  return <div className={`students-page-root adm-embed ${isDarkMode ? "dark-mode" : ""}`}>{children}</div>;
}

export function EnrollModal({ sectionId, student, onClose, onDone }) {
  const [photos, setPhotos] = useState([]); // File objects
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addPhotos = (files) => {
    setError("");
    setPhotos((current) => [...current, ...files].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const resized = await Promise.all(photos.map((file) => resizeImage(file, ENROLL_MAX_SIDE)));
      await enrollSectionFace(sectionId, student.id, resized);
      onDone(`${student.name}: face enrolled with ${resized.length} photo${resized.length > 1 ? "s" : ""}.`);
    } catch (err) {
      setError(err.message || "Enrollment failed.");
      setBusy(false);
    }
  };

  return (
    <Tokens>
      <Modal title={`${student.face_enrolled ? "Re-enroll" : "Enroll"} ${student.name}`} onClose={busy ? () => {} : onClose}>
        <p className="mg-hint">
          Add 1 to {MAX_PHOTOS} photos of this student: head and shoulders, one person in frame, face clearly visible.{" "}
          {student.face_enrolled && "Re-enrolling replaces the old photos."}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="mg-btn secondary mg-file">
            Choose photos
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => {
                addPhotos([...e.target.files]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="mg-btn secondary" onClick={() => setCameraOn((on) => !on)}>
            {cameraOn ? "Close camera" : "Use camera"}
          </button>
        </div>

        {cameraOn && (
          <div style={{ marginTop: 12 }}>
            <CameraCapture onCapture={(file) => addPhotos([file])} />
          </div>
        )}

        {photos.length > 0 && (
          <div className="mg-photos">
            {previews.map((url, index) => (
              <div key={url} style={{ position: "relative" }}>
                <img src={url} alt={`Photo ${index + 1}`} />
                <button
                  type="button"
                  className="cs-modal-close"
                  style={{ position: "absolute", top: 4, right: 4 }}
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="mg-alert error" role="alert">{error}</div>}

        <div className="mg-modal-foot">
          <button type="button" className="mg-btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="mg-btn" onClick={submit} disabled={busy || photos.length === 0}>
            {busy ? "Enrolling..." : `Enroll with ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </Modal>
    </Tokens>
  );
}

export function ProfileModal({ sectionId, studentId, onClose, onEnroll, onDeleted }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSectionStudent(sectionId, studentId)
      .then((data) => !cancelled && setProfile(data))
      .catch((err) => !cancelled && setError(err.message || "Could not load the profile."));
    return () => {
      cancelled = true;
    };
  }, [sectionId, studentId]);

  const removeFace = async () => {
    if (!window.confirm(`Delete ${profile.name}'s face data and photos? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteSectionFace(sectionId, studentId);
      onDeleted(`${profile.name}: face data deleted.`);
    } catch (err) {
      setError(err.message || "Could not delete the face data.");
      setBusy(false);
    }
  };

  return (
    <Tokens>
      <Modal title={profile ? profile.name : "Student"} onClose={onClose} wide>
        {error && <div className="mg-alert error" role="alert">{error}</div>}
        {!profile && !error && <p className="mg-hint">Loading...</p>}
        {profile && (
          <>
            <p className="mg-hint">
              Roll number <strong>{profile.roll_number}</strong> ·{" "}
              <span className={`mg-badge ${profile.face_enrolled ? "yes" : "no"}`}>
                {profile.face_enrolled ? "Face enrolled" : "Not enrolled"}
              </span>
            </p>

            <h2>Enrollment photos</h2>
            {profile.photos.length === 0 ? (
              <p className="mg-hint">No photos stored.</p>
            ) : (
              <div className="mg-photos">
                {profile.photos.map((photo, index) => (
                  <img key={photo.id} src={photo.url} alt={`${profile.name}, enrollment photo ${index + 1}`} />
                ))}
              </div>
            )}
            <p className="mg-hint" style={{ marginTop: 10 }}>
              Photo links expire after a few minutes; reopen this profile to refresh them.
            </p>

            <div className="mg-modal-foot">
              {profile.face_enrolled && (
                <button type="button" className="mg-btn danger" onClick={removeFace} disabled={busy}>
                  Delete face data
                </button>
              )}
              <button type="button" className="mg-btn" onClick={() => onEnroll(profile)}>
                {profile.face_enrolled ? "Re-enroll" : "Enroll face"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Tokens>
  );
}
