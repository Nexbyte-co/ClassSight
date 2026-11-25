// Admin: add a subject (/admin/subjects/new) or edit one (/admin/subjects/:subjectKey/edit-details); both share one layout.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Plus, Save, Trash2, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createClassroom, deleteClassroom, setClassroomTypes, updateClassroom } from "../../api/classrooms";
import { CategoryPicker, SessionTypePicker, sameTypes, typesOf } from "../../components/admin/SessionTypes";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import { getDegreeDurations, getYearLimits, listDegreeProgrammeCodes, listDegreeProgrammes } from "../../api/degreeProgrammes";
import { AdminLoadState, AdminPageHeader, Card, FormMessage } from "../../components/admin/ui";
import SearchSelect from "../../components/admin/SearchSelect";
import { num, subjectKey, yearOfStudy } from "../../components/admin/format";

function AdminSubjectPage() {
  const { subjectKey: keyParam } = useParams();
  const isNew = !keyParam;
  const subjectsHome = "/admin/subjects";
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { classrooms, sessionsByClass, refresh, loadedAt } = useAdminData();

  const key = keyParam ? decodeURIComponent(keyParam) : "";
  const rows = useMemo(() => classrooms.filter((c) => subjectKey(c) === key), [classrooms, key]);
  const first = rows[0];


  const [programmes, setProgrammes] = useState([]);
  const [codes, setCodes] = useState({}); // programme -> its letter(s) in a batch name (C, MCA, ...)
  const [limits, setLimits] = useState({}); // programmes only offered in some years of study
  const [durations, setDurations] = useState({}); // years each degree lasts
  useEffect(() => {
    let live = true;
    listDegreeProgrammes().then((d) => live && setProgrammes(d)).catch(() => {});
    listDegreeProgrammeCodes().then((d) => live && setCodes(d)).catch(() => {});
    getYearLimits().then((l) => live && setLimits(l)).catch(() => {});
    getDegreeDurations().then((d) => live && setDurations(d)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const [form, setForm] = useState({
    course: params.get("name") || "",
    code: params.get("code") || "",
    programme: params.get("programme") || "",
    allotted: [], // programmes this subject is allotted to: [{ programme, startYear }]
    startYear: "", // first year of the batch (e.g. 2024); its year of study decides which programmes are offered, as for batches
    category: params.get("category") === "elective" ? "elective" : "core",
    types: params.has("lecture") || params.has("lab") || params.has("tutorial")
      ? { lecture: +params.get("lecture") || 0, lab: +params.get("lab") || 0, tutorial: +params.get("tutorial") || 0 }
      : { lecture: 1, lab: 0, tutorial: 0 },
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setMsg(null);
  };
  const pick = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setMsg(null);
  };

  // Same rule as the batch page: a limited programme (e.g. Dera Bassi CSE: years 3 and 4) only shows in those years.
  const yearNo = /^\d{4}$/.test(form.startYear) ? yearOfStudy(Number(form.startYear)) : null;
  const offered = (p, y) => (!limits[p] || (y !== null && limits[p].includes(y))) && (y === null || !durations[p] || y <= durations[p]);
  // The programmes this subject is allotted to: the form's list when adding, a draft over the saved one when editing.
  const savedAllotted = (first?.programmes ?? []).map((p) => ({ programme: p.degree_programme, startYear: p.start_year ? String(p.start_year) : "" }));
  const savedKey = JSON.stringify(savedAllotted);
  const [allottedDraft, setAllottedDraft] = useState(null);
  const allotted = isNew ? form.allotted : allottedDraft ?? savedAllotted;
  const setAllotted = (list) => (isNew ? setForm((f) => ({ ...f, allotted: list })) : setAllottedDraft(list));
  const programmeOptions = programmes.filter((p) => offered(p, yearNo) && !allotted.some((a) => a.programme === p));
  const duration = durations[form.programme];
  const endYear = yearNo !== null && duration ? String(Number(form.startYear) + duration) : "";
  const acronym = (a) => `${a.startYear ? yearOfStudy(Number(a.startYear)) : ""}${codes[a.programme] ?? a.programme.replace(/ \(.*\)$/, "")}`;
  const addAllotted = () => {
    if (!form.programme) return setMsg({ kind: "error", text: "Choose a degree programme first." });
    if (yearNo === null && isNew) return setMsg({ kind: "error", text: "Enter the first year (e.g. 2024)." });
    setAllotted([...allotted.filter((a) => a.programme !== form.programme), { programme: form.programme, startYear: yearNo === null ? "" : form.startYear }]);
    setForm((f) => ({ ...f, programme: "", startYear: "" }));
    setMsg(null);
  };
  const changeYear = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    const y = v.length === 4 ? yearOfStudy(Number(v)) : null;
    setForm((f) => ({ ...f, startYear: v, programme: f.programme && !offered(f.programme, y) ? "" : f.programme }));
    setMsg(null);
  };

  const [confirming, setConfirming] = useState(false);
  const current = rows.length ? typesOf(rows) : { lecture: 1, lab: 0, tutorial: 0 };
  const [typesDraft, setTypesDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const totalSessions = rows.reduce((n, c) => n + (sessionsByClass[c.id] ?? 0), 0);

  // Editing an existing subject: sessions, category and programme are drafts until Save, applied to all its batches.
  const typesValue = isNew ? form.types : typesDraft ?? current;
  const categoryValue = isNew ? form.category : categoryDraft ?? (first?.category || "core");
  const onTypes = (types) => { if (isNew) setForm((f) => ({ ...f, types })); else setTypesDraft(types); setMsg(null); };
  const onCategory = (category) => { if (isNew) setForm((f) => ({ ...f, category })); else setCategoryDraft(category); setMsg(null); };
  const typesChanged = !isNew && (!sameTypes(typesValue, current) || categoryValue !== (first?.category || "core"));
  const programmeChanged = !isNew && JSON.stringify(allotted) !== savedKey;
  const [nameDraft, setNameDraft] = useState(null);
  const [codeDraft, setCodeDraft] = useState(null);
  const nameValue = isNew ? form.course : nameDraft ?? first?.course ?? "";
  const codeValue = isNew ? form.code : codeDraft ?? first?.course_code ?? "";
  const nameChanged = !isNew && (nameValue.trim() !== (first?.course ?? "") || codeValue.trim() !== (first?.course_code ?? ""));

  const removeSubject = async () => {
    setBusy(true);
    try {
      for (const c of rows) await deleteClassroom(c.id);
      await refresh();
      navigate(subjectsHome, { replace: true });
    } catch (err) {
      await refresh();
      setConfirming(false);
      setBusy(false);
      setMsg({ kind: "error", text: err.message || "Could not delete the subject." });
    }
  };

  if (!isNew && loadedAt && !first && !busy) return <Navigate to={subjectsHome} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!isNew) {
      if (!typesChanged && !programmeChanged && !nameChanged) return setMsg({ kind: "ok", text: "Nothing to save." });
      if (!nameValue.trim()) return setMsg({ kind: "error", text: "Give the subject a name." });
      if (!allotted.length) return setMsg({ kind: "error", text: "Allot the subject to at least one degree programme (pick one, press the tick)." });
      setBusy(true);
      setMsg(null);
      try {
        for (const c of rows) {
          if (typesChanged) await setClassroomTypes(c.id, typesValue, categoryValue);
          const edit = {};
          if (nameChanged) Object.assign(edit, { course: nameValue.trim(), courseCode: codeValue.trim() });
          if (programmeChanged) edit.programmes = allotted;
          if (Object.keys(edit).length) await updateClassroom(c.id, edit);
        }
        await refresh();
        // The page address is the subject's code (or name), so it moves when either is renamed.
        const newKey = codeValue.trim() || nameValue.trim();
        if (nameChanged && newKey !== key) navigate(`${subjectsHome}/${encodeURIComponent(newKey)}/edit-details`, { replace: true });
        setNameDraft(null);
        setCodeDraft(null);
        setTypesDraft(null);
        setCategoryDraft(null);
        setAllottedDraft(null);
        setMsg({ kind: "ok", text: "Saved." });
      } catch (err) {
        setMsg({ kind: "error", text: err.message || "Could not save the changes." });
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!form.course.trim()) return setMsg({ kind: "error", text: "Give the subject a name." });
    if (!form.allotted.length) return setMsg({ kind: "error", text: "Allot the subject to at least one degree programme (pick one, enter the years, press the tick)." });
    setBusy(true);
    setMsg(null);
    try {
      const made = await createClassroom({
        course: form.course.trim(),
        section: "",
        courseCode: form.code.trim(),
        programmes: form.allotted,
        types: form.types,
        category: form.category,
      });
      await refresh();
      navigate(`${subjectsHome}/${encodeURIComponent(subjectKey(made))}/edit-details`, { replace: true });
    } catch (err) {
      setMsg({ kind: "error", text: err.status === 409 ? "A subject with this name already exists." : err.message || "Could not add the subject." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-fit adm-subject-new">
      <Link to={subjectsHome} className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to Subjects
      </Link>
      <AdminPageHeader title={isNew ? "Add a subject" : first?.course || "Subject"} lead={isNew ? "" : first?.course_code || ""} refresh={false} />
      <AdminLoadState />

      {(isNew || first) && (
        <div className="adm-grid adm-fill adm-subject-two">
        <Card title="Subject details" sub="Sessions, category, name and code." delay={40}>
          <form className="adm-form adm-subject-form" onSubmit={submit} noValidate>
            <div className="adm-subject-types">
              <SessionTypePicker value={typesValue} onChange={onTypes} disabled={busy} />
              <CategoryPicker value={categoryValue} onChange={onCategory} disabled={busy} />
            </div>
            <div className="adm-subject-row">
              <div className="adm-field">
                <label htmlFor="sj-name">Subject name</label>
                <input id="sj-name" value={nameValue} onChange={isNew ? set("course") : (e) => { setNameDraft(e.target.value); setMsg(null); }} disabled={busy} autoComplete="off" />
              </div>
              <div className="adm-field">
                <label htmlFor="sj-code">Subject code</label>
                <input id="sj-code" value={codeValue} onChange={isNew ? set("code") : (e) => { setCodeDraft(e.target.value); setMsg(null); }} disabled={busy} autoComplete="off" placeholder="e.g. UCS301" />
              </div>
            </div>
            <div className="adm-form-foot">
              <FormMessage msg={msg} />
              {!isNew && (
                <button type="button" className="db-btn adm-danger adm-foot-delete" onClick={() => setConfirming(true)} disabled={busy}>
                  <Trash2 size={15} aria-hidden="true" /> Delete subject
                </button>
              )}
              <Link to={subjectsHome} className="db-btn">Cancel</Link>
              <button type="submit" className="db-btn adm-primary" disabled={busy}>
                {isNew ? <Plus size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />} {busy ? "Saving…" : isNew ? "Add subject" : "Save changes"}
              </button>
            </div>
          </form>
        </Card>
        <Card title="Allotted to degree programmes" sub={isNew ? "Choose a programme and its years, then press the tick." : "Choose a degree programme, then press the tick."} delay={90} className="adm-allot-card">
          <div className="adm-allot-pick">
            <div className="adm-field">
              <label htmlFor="sj-from">Years</label>
              <div className="adm-years">
                <input id="sj-from" inputMode="numeric" maxLength={4} placeholder="2024" aria-label="First year" value={form.startYear} disabled={busy} onChange={changeYear} />
                <span aria-hidden="true">to</span>
                <input readOnly tabIndex={-1} aria-label="Last year, set by the degree programme" title={duration ? `Fixed: this degree lasts ${duration} years` : "Set by the degree programme"} placeholder="—" value={endYear} className="adm-years-fixed" />
                {yearNo !== null && <b className="adm-years-len">Year {yearNo}</b>}
              </div>
            </div>
            <div className="adm-allot-prog">
              <SearchSelect id="sj-programme" label="Degree programme" placeholder="Choose a degree programme" options={programmeOptions} value={form.programme} onChange={pick("programme")} clearable={false} />

            <button type="button" className="db-btn adm-primary adm-tick" aria-label="Add this programme" title="Add" onClick={addAllotted} disabled={busy}>
              <Check size={18} aria-hidden="true" />
            </button>
            </div>
          </div>
          <div className="adm-allot-sub">
          <b className="adm-allot-sub-title">Degree programmes with this subject <span className="db-sm">({allotted.length})</span></b>
          <ul className="adm-allot-list" aria-label="Degree programmes this subject is allotted to">
            {allotted.map((a) => (
              <li key={a.programme}>
                <b className="adm-name-chip-sm">{acronym(a)}</b>
                <span className="adm-allot-name">{a.programme}</span>
                <span className="db-sm">{a.startYear ? `${a.startYear}–${Number(a.startYear) + (durations[a.programme] ?? 4)}` : ""}</span>
                <button type="button" className="adm-allot-x" aria-label={`Remove ${a.programme}`} onClick={() => setAllotted(allotted.filter((x) => x.programme !== a.programme))}>
                  <X size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
            {!allotted.length && <li className="db-sm adm-allot-empty">Nothing added yet.</li>}
          </ul>
          </div>
        </Card>
        </div>
      )}

      {confirming && first && (
        <ConfirmDialog title={`Delete ${first.course}?`} confirmLabel="Delete permanently" busy={busy} onConfirm={removeSubject} onClose={() => setConfirming(false)}>
          This is <b>permanent</b>. {first.course} will be removed from {rows.map((c) => c.section).join(", ")}, along with its timetable and{" "}
          {num(totalSessions)} saved attendance session{totalSessions === 1 ? "" : "s"}. Students and batches are not deleted.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default AdminSubjectPage;
