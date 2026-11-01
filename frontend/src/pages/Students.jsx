// src/pages/Students.jsx
// Roster. Admin: pick a section, add students, enroll faces, view profiles. Teacher: read-only roster of the class.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, GraduationCap, Search, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import PageShell from "../components/PageShell";
import Modal from "../components/Modal";
import CameraCapture from "../components/CameraCapture";
import { useClassroom } from "../context/ClassroomContext";
import { useAuth } from "../context/AuthContext";
import { listStudents } from "../api/classrooms";
import {
  createSection,
  createSectionStudent,
  deleteSectionFace,
  enrollSectionFace,
  getSectionStudent,
  listSectionStudents,
  listSections,
} from "../api/sections";
import { ENROLL_MAX_SIDE, resizeImage } from "../lib/resizeImage";

const PAGE_SIZE = 8;
const MAX_PHOTOS = 5;
const SECTION_KEY = "classsight_section_id";

function readStoredSection() {
  try {
    return Number(localStorage.getItem(SECTION_KEY)) || null;
  } catch {
    return null;
  }
}

function EnrollModal({ sectionId, student, onClose, onDone }) {
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
    <Modal
      title={`${student.face_enrolled ? "Re-enroll" : "Enroll"} ${student.name}`}
      onClose={busy ? () => {} : onClose}
    >
      <p className="mg-hint">
        Add 1 to {MAX_PHOTOS} photos of this student: head and shoulders, one person in frame, face
        clearly visible. {student.face_enrolled && "Re-enrolling replaces the old photos."}
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
  );
}

function ProfileModal({ sectionId, studentId, onClose, onEnroll, onDeleted }) {
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
  );
}

function Students() {
  const { session } = useAuth();
  const isAdmin = session?.apiRole === "admin";
  const { classroom, loading: classLoading, error: classError } = useClassroom();

  // Admin: sections. Everyone else: the selected class (read-only).
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState(readStoredSection);
  const [newSectionName, setNewSectionName] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const sectionReq = useRef(0);

  const loadSections = useCallback(async () => {
    const id = ++sectionReq.current;
    setSectionsLoading(true);
    setSectionsError("");
    try {
      const list = await listSections();
      if (id === sectionReq.current) setSections(list);
    } catch (err) {
      if (id === sectionReq.current) setSectionsError(err.message || "Could not load sections.");
    } finally {
      if (id === sectionReq.current) setSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadSections();
  }, [isAdmin, loadSections]);

  const section = isAdmin ? sections.find((x) => x.id === selectedSectionId) || sections[0] || null : null;
  const sectionId = section?.id;
  const classroomId = classroom?.id;
  const scopeId = isAdmin ? sectionId : classroomId;
  const hasScope = isAdmin ? !!section : !!classroom;

  const chooseSection = (id) => {
    setSelectedSectionId(id);
    setSearch("");
    setPage(1);
    setNotice("");
    try {
      localStorage.setItem(SECTION_KEY, String(id));
    } catch {
      /* ignore */
    }
  };

  const addSection = async (e) => {
    e.preventDefault();
    setCreatingSection(true);
    setSectionError("");
    try {
      const created = await createSection(newSectionName.trim());
      setNewSectionName("");
      await loadSections();
      chooseSection(created.id);
    } catch (err) {
      setSectionError(err.status === 409 ? "A section with that name already exists." : err.message);
    } finally {
      setCreatingSection(false);
    }
  };

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("roll-asc");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [newRoll, setNewRoll] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [profileId, setProfileId] = useState(null);
  const [enrollTarget, setEnrollTarget] = useState(null);

  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current; // ignore answers that arrive after a newer request
    if (!scopeId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await (isAdmin ? listSectionStudents(scopeId) : listStudents(scopeId));
      if (id === requestId.current) setStudents(list);
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Could not load students.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [scopeId, isAdmin]);

  // Switching class: drop the old roster right away instead of showing it until the load ends.
  useEffect(() => {
    setStudents([]);
  }, [scopeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = students.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)
    );
    const byRoll = (a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
    list.sort((a, b) => {
      if (sortBy === "roll-desc") return byRoll(b, a);
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return byRoll(a, b);
    });
    return list;
  }, [students, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const enrolledCount = students.filter((s) => s.face_enrolled).length;

  const addStudent = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    try {
      const created = await createSectionStudent(sectionId, { rollNumber: newRoll.trim(), name: newName.trim() });
      setNewRoll("");
      setNewName("");
      setShowAdd(false);
      setNotice(`${created.name} added. Enroll their face next.`);
      await reload();
      setEnrollTarget(created);
    } catch (err) {
      setAddError(err.status === 409 ? "A student with this roll number already exists." : err.message);
    } finally {
      setAdding(false);
    }
  };

  const finish = async (message) => {
    setEnrollTarget(null);
    setProfileId(null);
    setNotice(message);
    await reload();
    loadSections(); // refresh the per-section student counts
  };

  return (
    <PageShell crumb="Students" activePage="students" showClassPicker={!isAdmin}>
      <div className="students-page-header">
        <div>
          <h1 className="students-page-title">Students</h1>
          <p className="students-page-subtitle">
            {isAdmin
              ? section
                ? `Section ${section.name}. Students added here belong to every class of this section. Enroll their faces so attendance and verification can recognise them.`
                : "Create a section, then add and enroll its students."
              : classroom
                ? `${classroom.course} - Section ${classroom.section}. Who is enrolled in this class.`
                : "No class is available yet."}
          </p>
        </div>
        {isAdmin && section && (
          <button type="button" className="mg-btn" onClick={() => setShowAdd((open) => !open)}>
            {showAdd ? "Cancel" : "Add student"}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mg-card">
          <h2>Section</h2>
          {sectionsError && (
            <div className="mg-alert error" role="alert">
              {sectionsError}{" "}
              <button type="button" className="mg-btn secondary small" onClick={loadSections}>
                Retry
              </button>
            </div>
          )}
          {sectionsLoading && sections.length === 0 && <p className="mg-hint">Loading sections...</p>}
          {sections.length > 0 && (
            <label className="mg-field">
              Selected section
              <select value={section?.id ?? ""} onChange={(e) => chooseSection(Number(e.target.value))}>
                {sections.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.student_count} student{x.student_count === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
            </label>
          )}
          {!sectionsLoading && !sectionsError && sections.length === 0 && (
            <p className="mg-hint">No sections yet. Create the first one below.</p>
          )}
          <form onSubmit={addSection} style={{ marginTop: 12 }}>
            <div className="mg-grid">
              <label className="mg-field">
                New section
                <input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g. 3C2"
                  required
                  maxLength={40}
                />
              </label>
              <button type="submit" className="mg-btn" disabled={creatingSection}>
                {creatingSection ? "Creating..." : "Create section"}
              </button>
            </div>
            {sectionError && <div className="mg-alert error" role="alert">{sectionError}</div>}
          </form>
        </div>
      )}

      {!isAdmin && classError && <div className="mg-alert error">{classError}</div>}

      {!isAdmin && !classroom && !classLoading && !classError && (
        <div className="mg-card mg-empty">
          <GraduationCap size={36} />
          <h2>No class yet</h2>
          <p>An admin creates a class and assigns it to a teacher under Admin. It will show up here.</p>
        </div>
      )}

      {hasScope && (
        <>
          {!isAdmin && (
            <div className="mg-alert warn">
              The roster is managed by an administrator. Ask an admin to add or enroll students.
            </div>
          )}
          {notice && (
            <div className="mg-alert ok" role="status">
              {notice}
            </div>
          )}

          {isAdmin && showAdd && (
            <form className="mg-card" onSubmit={addStudent}>
              <h2>Add a student</h2>
              <p className="mg-hint">The roll number must be unique across the whole college.</p>
              <div className="mg-grid">
                <label className="mg-field">
                  Roll number
                  <input value={newRoll} onChange={(e) => setNewRoll(e.target.value)} required maxLength={40} />
                </label>
                <label className="mg-field">
                  Full name
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={120} />
                </label>
                <button type="submit" className="mg-btn" disabled={adding}>
                  {adding ? "Adding..." : "Add and enroll face"}
                </button>
              </div>
              {addError && <div className="mg-alert error" role="alert">{addError}</div>}
            </form>
          )}

          <div className="cohort-summary-grid">
            <div className="cohort-card">
              <div className="cohort-icon-box total">
                <GraduationCap size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Students</span>
                <strong className="cohort-value">{students.length}</strong>
              </div>
            </div>
            <div className="cohort-card">
              <div className="cohort-icon-box safe">
                <CheckCircle2 size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Face enrolled</span>
                <strong className="cohort-value text-safe">{enrolledCount}</strong>
              </div>
            </div>
            <div className="cohort-card">
              <div className="cohort-icon-box warning">
                <AlertCircle size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Not enrolled yet</span>
                <strong className="cohort-value text-warning">{students.length - enrolledCount}</strong>
              </div>
            </div>
          </div>

          <div className="students-controls-card">
            <div className="search-sort-group" style={{ width: "100%" }}>
              <div className="student-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="search-input"
                  aria-label="Search students"
                />
              </div>
              <div className="student-sort-box">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                  aria-label="Sort students"
                >
                  <option value="roll-asc">Roll No: low to high</option>
                  <option value="roll-desc">Roll No: high to low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>
          </div>

          <div className="students-table-card">
            {error && <div className="mg-alert error">{error}</div>}
            {loading && students.length === 0 ? (
              <div className="mg-empty">Loading students...</div>
            ) : visible.length === 0 ? (
              <div className="mg-empty">
                <h3>{students.length === 0 ? "No students yet" : "No match"}</h3>
                <p>
                  {students.length === 0
                    ? isAdmin
                      ? "Use Add student to build the roster."
                      : "No students in this class yet."
                    : `No student matches "${search}".`}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll number</th>
                      <th>Face</th>
                      {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((student) => (
                      <tr key={student.id}>
                        <td>{student.name}</td>
                        <td>
                          <span className="student-roll-tag">{student.roll_number}</span>
                        </td>
                        <td>
                          <span className={`mg-badge ${student.face_enrolled ? "yes" : "no"}`}>
                            {student.face_enrolled ? "Enrolled" : "Not enrolled"}
                          </span>
                        </td>
                        {isAdmin && (
                        <td>
                          <div className="mg-actions">
                            <button
                              type="button"
                              className="mg-btn secondary small"
                              onClick={() => setProfileId(student.id)}
                            >
                              <Eye size={14} style={{ verticalAlign: "-2px" }} /> Profile
                            </button>
                            <button
                              type="button"
                              className="mg-btn small"
                              onClick={() => setEnrollTarget(student)}
                            >
                              {student.face_enrolled ? "Re-enroll" : "Enroll face"}
                            </button>
                          </div>
                        </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <span className="results-count">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <p className="mg-hint" style={{ marginTop: 14 }}>
            Attendance percentages and history appear on the{" "}
            <Link to="/reports">Reports</Link> page once attendance has been saved.
          </p>
        </>
      )}

      {isAdmin && profileId && !enrollTarget && (
        <ProfileModal
          sectionId={sectionId}
          studentId={profileId}
          onClose={() => setProfileId(null)}
          onEnroll={(profile) => setEnrollTarget(profile)}
          onDeleted={finish}
        />
      )}
      {isAdmin && enrollTarget && (
        <EnrollModal
          sectionId={sectionId}
          student={enrollTarget}
          onClose={() => setEnrollTarget(null)}
          onDone={finish}
        />
      )}
    </PageShell>
  );
}

export default Students;
