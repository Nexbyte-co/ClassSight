// Admin: add a student (/admin/students/new) or edit one (/admin/students/:studentId/edit-details) to edit or delete.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, ScanFace, Trash2, User, UserPlus } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createSectionStudent, deleteSectionFace, deleteSectionStudent, enrollSectionFace, getSectionStudent, updateSectionStudent } from "../../api/sections";
import { ENROLL_MAX_SIDE, resizeImage } from "../../lib/resizeImage";
import FacePhotoPicker from "../../components/admin/FacePhotoPicker";
import { AdminLoadState, AdminPageHeader, Card, FormMessage } from "../../components/admin/ui";
import SearchSelect from "../../components/admin/SearchSelect";
import PasswordGen from "../../components/admin/PasswordGen";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import NfcCardLink from "../../components/admin/NfcCardLink";
import { pct } from "../../components/admin/format";

// First letter of the first name and of the last name (one letter for a single word).
const initials = (name) => {
  const w = name.split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

function AdminStudentPage() {
  const { studentId } = useParams();
  const isNew = !studentId;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { students, sections, sectionById, sessions, refresh, loadedAt } = useAdminData();
  const student = isNew ? null : students.find((s) => String(s.id) === studentId);

  const numeric = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  const programmes = useMemo(() => [...new Set(sections.map((s) => s.degree_programme).filter(Boolean))].sort(numeric), [sections]);
  const [form, setForm] = useState({ name: "", roll: "", email: "", password: "", batch: "", subbatch: "", programme: "" });
  // Batches of the chosen degree programme (older batches with no programme are listed when none is chosen).
  const batchNames = useMemo(
    () => sections.filter((s) => !s.parent_id && (form.programme ? s.degree_programme === form.programme : !s.degree_programme)).map((s) => s.name).sort(numeric),
    [sections, form.programme]
  );
  // Subbatches that exist inside the chosen batch (3C23 inside 3C2); none if the batch has none.
  const subbatchNames = useMemo(() => {
    const batch = sections.find((s) => s.name === form.batch);
    return batch ? sections.filter((s) => s.parent_id === batch.id).map((s) => s.name).sort(numeric) : [];
  }, [sections, form.batch]);
  const batchEnabled = Boolean(form.programme) || (!isNew && Boolean(form.batch));
  const [loadedFor, setLoadedFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const location = useLocation();
  const [photos, setPhotos] = useState([]); // optional face photos (Files)
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceMsg, setFaceMsg] = useState(null);
  const [saved, setSaved] = useState([]); // enrolled photos of an existing student (presigned urls)
  const notice = location.state?.notice;
  const [shown, setShown] = useState(0); // which new photo the big preview shows
  const shownIdx = Math.min(shown, Math.max(photos.length - 1, 0));
  const previewUrl = useMemo(() => (photos[shownIdx] ? URL.createObjectURL(photos[shownIdx]) : null), [photos, shownIdx]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);
  const picture = previewUrl || saved[0] || null;

  useEffect(() => {
    if (notice) setFaceMsg(notice);
  }, [notice]);

  const savedFor = student ? `${student.id}:${student.face_enrolled}` : "";
  useEffect(() => {
    if (!student || !student.face_enrolled) {
      setSaved([]);
      return undefined;
    }
    let live = true;
    getSectionStudent(student.section_id, student.id)
      .then((p) => live && setSaved(p.photos.map((x) => x.url)))
      .catch(() => live && setSaved([]));
    return () => {
      live = false;
    };
  }, [savedFor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fill the form once: from the student being edited, or from ?batch= when adding from a batch page.
  useEffect(() => {
    const key = isNew ? `new:${sections.length}` : student ? `s:${student.id}` : null;
    if (!key || loadedFor === key) return;
    if (isNew) {
      const pre = sectionById.get(Number(params.get("batch")));
      setForm((f) => ({ ...f, batch: f.batch || pre?.name || "", programme: f.programme || pre?.degree_programme || "" }));
    } else {
      const own = sectionById.get(student.section_id);
      const parent = own?.parent_id ? sectionById.get(own.parent_id) : null;
      setForm({
        name: student.name,
        roll: student.roll_number,
        email: student.email || "",
        subbatch: parent ? own.name : "",
        password: "",
        batch: (parent ?? own)?.name || "",
        programme: (parent ?? own)?.degree_programme || "",
      });
    }
    setLoadedFor(key);
  }, [isNew, student, sections, sectionById, params, loadedFor]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };

  const attendance = useMemo(() => {
    if (!student) return null;
    let present = 0;
    let total = 0;
    sessions.forEach((s) =>
      s.records.forEach((r) => {
        if (r.student_id !== student.id) return;
        total += 1;
        if (r.status === "present") present += 1;
      })
    );
    return total ? { present, total } : null;
  }, [sessions, student]);

  if (!isNew && loadedAt && !student) return <Navigate to="/admin/students" replace />;

  const submit = async (e) => {
    e.preventDefault();
    // A student of a subbatch belongs to that subbatch's own batch record (its classes and its batch's classes both reach them).
    const target = sections.find((s) => s.name === (form.subbatch || form.batch));
    if (!form.name.trim() || !form.roll.trim()) return setMsg({ kind: "error", text: "Name and roll number are required." });
    if (!target) return setMsg({ kind: "error", text: "Choose a batch." });
    if (isNew && !form.email.trim()) return setMsg({ kind: "error", text: "Email is required." });
    if (isNew && form.password.length < 8) return setMsg({ kind: "error", text: "Password must be at least 8 characters." });
    if (!isNew && form.password && form.password.length < 8) return setMsg({ kind: "error", text: "A new password must be at least 8 characters." });
    setBusy(true);
    setMsg(null);
    try {
      if (isNew) {
        const created = await createSectionStudent(target.id, {
          rollNumber: form.roll.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        let notice = null;
        if (photos.length) {
          try {
            const resized = await Promise.all(photos.map((f) => resizeImage(f, ENROLL_MAX_SIDE)));
            await enrollSectionFace(target.id, created.id, resized);
            notice = { kind: "ok", text: "Student added and face enrolled." };
          } catch (err) {
            setPhotos([]); // the rejected photos are not kept; pick new ones on the student's page
            notice = { kind: "error", text: `Student added, but the face was not enrolled: ${err.message}. Try other photos below.` };
          }
        }
        await refresh();
        navigate(`/admin/students/${created.id}/edit-details`, { replace: true, state: { notice } });
      } else {
        await updateSectionStudent(student.section_id, student.id, {
          name: form.name.trim(),
          rollNumber: form.roll.trim(),
          email: form.email.trim(),
          password: form.password,
          newSectionId: target.id !== student.section_id ? target.id : undefined,
        });
        await refresh();
        setForm((f) => ({ ...f, password: "" }));
        setMsg({ kind: "ok", text: form.password ? "Saved. The password was changed; share it with the student securely." : "Saved." });
      }
    } catch (err) {
      setMsg({ kind: "error", text: err.status === 409 ? err.message : err.message || "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  const enrollNow = async () => {
    setFaceBusy(true);
    setFaceMsg(null);
    try {
      const resized = await Promise.all(photos.map((f) => resizeImage(f, ENROLL_MAX_SIDE)));
      await enrollSectionFace(student.section_id, student.id, resized);
      setPhotos([]);
      await refresh();
      setFaceMsg({ kind: "ok", text: `Face enrolled with ${resized.length} photo${resized.length === 1 ? "" : "s"}.` });
    } catch (err) {
      setFaceMsg({ kind: "error", text: err.message || "Enrollment failed." });
    } finally {
      setFaceBusy(false);
    }
  };

  const removeFace = async () => {
    setFaceBusy(true);
    setFaceMsg(null);
    try {
      await deleteSectionFace(student.section_id, student.id);
      await refresh();
      setFaceMsg({ kind: "ok", text: "Face data deleted." });
    } catch (err) {
      setFaceMsg({ kind: "error", text: err.message || "Could not delete the face data." });
    } finally {
      setFaceBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteSectionStudent(student.section_id, student.id);
      await refresh();
      navigate("/admin/students", { replace: true });
    } catch (err) {
      setConfirming(false);
      setBusy(false);
      setMsg({ kind: "error", text: err.message || "Could not delete the student." });
    }
  };

  const where = [form.programme, form.batch && `Batch ${form.batch}`, form.subbatch && `Subbatch ${form.subbatch}`].filter(Boolean).join(" · ");

  return (
    <div className="adm-fit adm-detail adm-student-page">
      <Link to="/admin/students" className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to Students
      </Link>
      <AdminPageHeader
        title={isNew ? "Add a student" : student?.name || "Student"}
        lead={isNew ? "Create the student's record and put them in a batch." : "Student details. Change anything and save."}
        refresh={false}
      />
      <AdminLoadState />

      <Card title={isNew ? "Student details" : "Edit details"} sub="Name, roll number, degree programme, batch and sign-in details." delay={40} className="adm-st-details">
        <form className="adm-form adm-st-form" onSubmit={submit} noValidate>
          <div className="adm-st-row">
            <div className="adm-field">
              <label htmlFor="st-name">Full name</label>
              <input id="st-name" value={form.name} onChange={set("name")} disabled={busy} autoComplete="off" />
            </div>
            <div className="adm-field">
              <label htmlFor="st-roll">Roll number</label>
              <input id="st-roll" value={form.roll} onChange={set("roll")} disabled={busy} autoComplete="off" />
            </div>
          </div>
          <SearchSelect
            id="st-programme"
            label="Degree programme"
            placeholder="Choose a degree programme first"
            options={programmes}
            value={form.programme}
            onChange={(v) => {
              setForm((f) => {
                const keep = sections.some((x) => x.name === f.batch && x.degree_programme === v);
                return { ...f, programme: v, batch: keep ? f.batch : "", subbatch: keep ? f.subbatch : "" };
              });
              setMsg(null);
            }}
            clearable={false}
          />
          <div className="adm-st-row">
            <SearchSelect
              id="st-batch"
              label="Batch"
              placeholder={batchEnabled ? "Choose a batch" : "Choose a degree programme first"}
              options={batchNames}
              value={form.batch}
              disabled={!batchEnabled}
              onChange={(v) => {
                setForm((f) => ({ ...f, batch: v, subbatch: "" }));
                setMsg(null);
              }}
              clearable={false}
            />
            <SearchSelect
              id="st-sub"
              label="Subbatch"
              placeholder={!form.batch ? "Choose a batch first" : subbatchNames.length ? "Choose a subbatch" : "This batch has no subbatches"}
              options={subbatchNames}
              value={form.subbatch}
              disabled={!form.batch || !subbatchNames.length}
              onChange={(v) => {
                setForm((f) => ({ ...f, subbatch: v }));
                setMsg(null);
              }}
            />
          </div>
          <div className="adm-st-row">
            <div className="adm-field">
              <label htmlFor="st-email">Email address</label>
              <input id="st-email" type="email" value={form.email} onChange={set("email")} disabled={busy} autoComplete="off" />
            </div>
            <PasswordGen
              id="st-pass"
              label={isNew ? "Password" : "New password (optional)"}
              value={form.password}
              onChange={(v) => {
                setForm((f) => ({ ...f, password: v }));
                setMsg(null);
              }}
              disabled={busy}
              hint={isNew ? "At least 8 characters." : "Leave blank to keep the current password."}
            />
          </div>
          <div className="adm-form-foot">
            <FormMessage msg={msg} />
            <Link to="/admin/students" className="db-btn">
              Cancel
            </Link>
            <button type="submit" className="db-btn adm-primary" disabled={busy}>
              {isNew ? <UserPlus size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
              {busy ? "Saving…" : isNew ? "Add student" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      <div className="adm-st-right">
        <Card title="Preview" delay={90} className="adm-st-preview">
          <div className="adm-preview">
            <span className="adm-avatar" aria-hidden="true">
              {picture ? <img src={picture} alt="" /> : initials(form.name)}
            </span>
            <div>
              <b>{form.name || "Student name"}</b>
              <span className="db-sm adm-mono">{form.roll || "Roll number"}</span>
              <span className="db-sm">{where || "No batch yet"}</span>
            </div>
          </div>
          <div className="adm-bigpic">
            <div className="adm-avatar-box" role="img" aria-label={picture ? "Chosen face photo, used as the avatar" : "No photo chosen yet"}>
              {picture ? <img src={picture} alt="" /> : <User strokeWidth={1.4} aria-hidden="true" />}
            </div>
          </div>
          {student && (
            <dl className="adm-facts">
              <div>
                <dt>Face data</dt>
                <dd>
                  <span className={`adm-chip ${student.face_enrolled ? "adm-chip-good" : ""}`}>
                    <ScanFace size={13} aria-hidden="true" /> {student.face_enrolled ? "Enrolled" : "Not enrolled"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>NFC card</dt>
                <dd><NfcCardLink student={student} onChanged={refresh} /></dd>
              </div>
              <div>
                <dt>Attendance</dt>
                <dd>{attendance ? `${pct(attendance.present / attendance.total)} · ${attendance.total} session${attendance.total === 1 ? "" : "s"}` : "No sessions yet"}</dd>
              </div>
            </dl>
          )}
        </Card>

        {student && (
          <Card title="Delete student" className="adm-card-danger" delay={130}>
            <p className="db-sm">Removes the student, their face data and their attendance records for good.</p>
            <button type="button" className="db-btn adm-danger" onClick={() => setConfirming(true)} disabled={busy}>
              <Trash2 size={15} aria-hidden="true" /> Delete {student.name}
            </button>
          </Card>
        )}
      </div>

      <Card
        title="Face enrollment"
        sub={isNew ? "Optional. Add photos now or enroll later from this student's page." : student?.face_enrolled ? "Enrolled. Add new photos to replace them." : "Not enrolled yet."}
        delay={80}
        className="adm-st-face"
      >
        <FacePhotoPicker
          photos={photos}
          onChange={setPhotos}
          disabled={busy || faceBusy}
          selected={shownIdx}
          onSelect={setShown}
          saved={saved}
          footer={
            <>
              <FormMessage msg={faceMsg} />
              {!isNew && (
                <div className="adm-pw-tools">
                  <button type="button" className="db-btn adm-primary" onClick={enrollNow} disabled={faceBusy || !photos.length}>
                    <ScanFace size={15} aria-hidden="true" /> {faceBusy ? "Working…" : student?.face_enrolled ? "Replace face" : "Enroll face"}
                  </button>
                  {student?.face_enrolled && (
                    <button type="button" className="db-btn" onClick={removeFace} disabled={faceBusy}>
                      <Trash2 size={15} aria-hidden="true" /> Delete face data
                    </button>
                  )}
                </div>
              )}
            </>
          }
        />
      </Card>

      {confirming && (
        <ConfirmDialog title={`Delete ${student.name}?`} confirmLabel="Delete permanently" busy={busy} onConfirm={remove} onClose={() => setConfirming(false)}>
          This is <b>permanent</b>. {student.name} ({student.roll_number}), their face data and all of their attendance records will be removed.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default AdminStudentPage;
