// Admin: add a batch (/admin/batches/new) or open one (/admin/batches/:sectionId): rename it, see its students and classes.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, BookOpen, ChevronDown, ChevronUp, GraduationCap, Layers, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createSection, deleteSection, updateSection } from "../../api/sections";
import { getDegreeDurations, getFirstYearRule, getYearLimits, listDegreeProgrammeCodes } from "../../api/degreeProgrammes";
import SearchSelect from "../../components/admin/SearchSelect";
import { AdminLoadState, AdminPageHeader, Card, Empty, FormMessage, StatTile } from "../../components/admin/ui";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import { num, parentBatchOf, subbatchesOf, subjectKey, teacherName, yearOfStudy } from "../../components/admin/format";

function AdminBatchPage() {
  const { sectionId } = useParams();
  const isNew = !sectionId;
  const navigate = useNavigate();
  const { sections, students, classrooms, sessionsByClass, userById, refresh, loadedAt } = useAdminData();
  const batch = isNew ? null : sections.find((s) => String(s.id) === sectionId);
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState(""); // new batch: the part of the name after the year-of-study digit
  const [programme, setProgramme] = useState("");
  const [startYear, setStartYear] = useState("");
  const [durations, setDurations] = useState({}); // years each degree lasts: the last year is always first + this
  const [codes, setCodes] = useState({}); // programme -> its letter(s) in a batch name
  const [limits, setLimits] = useState({}); // programmes only offered in some years of study
  // A limited programme (e.g. Dera Bassi CSE: years 3 and 4) shows only once the first year makes it that year of study.
  const offered = (p, d) => (!limits[p] || (d !== null && limits[p].includes(d))) && (d === null || !durations[p] || d <= durations[p]); // not over yet
  const [firstYear, setFirstYear] = useState({ letters: ["A", "B"], own_letter: [] }); // year-1 groups
  const MAX_SUB = 12;
  const [subStyle, setSubStyle] = useState("letter"); // subbatch names: A, B, C or 1, 2, 3
  const [subTo, setSubTo] = useState(null); // last subbatch as a position (0 = A or 1); the first is always A or 1; null = not split
  const subCount = subTo !== null ? subTo + 1 : 0;
  const stepTo = (d) => {
    const n = (subTo ?? -1) + d;
    if (n < 0) return setSubTo(null);
    if (n < MAX_SUB) setSubTo(n);
  };
  const subLabel = (i) => (subStyle === "letter" ? String.fromCharCode(65 + i) : String(i + 1));
  const [groupLetter, setGroupLetter] = useState("A"); // A or B, for a common first-year batch
  useEffect(() => {
    let live = true;
    listDegreeProgrammeCodes().then((d) => live && setCodes(d)).catch(() => {});
    getFirstYearRule().then((r) => live && setFirstYear(r)).catch(() => {});
    getYearLimits().then((l) => live && setLimits(l)).catch(() => {});
    getDegreeDurations().then((d) => live && setDurations(d)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (batch) {
      setName(batch.name);
      setProgramme(batch.degree_programme || "");
      setStartYear(batch.start_year ? String(batch.start_year) : "");
      const group = batch.name.charAt(1).toUpperCase();
      if (group === "A" || group === "B") setGroupLetter(group); // a first-year batch keeps its A or B
    }
  }, [batch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // An existing batch with a programme and a first year gets the same chips as a new one; its old name fills the box.
  const seeded = useRef(null);
  const roster = useMemo(
    () =>
      batch
        ? students.filter((s) => s.section_id === batch.id).sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }))
        : [],
    [students, batch]
  );
  const classes = useMemo(() => (batch ? classrooms.filter((c) => c.section === batch.name) : []), [classrooms, batch]);
  const subbatches = useMemo(() => (batch ? subbatchesOf(batch, sections) : []), [batch, sections]);
  const parent = batch ? parentBatchOf(batch, sections) : null;
  const sessionCount = classes.reduce((sum, c) => sum + (sessionsByClass[c.id] ?? 0), 0);

  // The first year decides the year of study, which is the number every batch name starts with.
  const digit = /^\d{4}$/.test(startYear) ? yearOfStudy(Number(startYear)) : null;
  const digitOk = digit !== null && digit >= 1 && digit <= 9;
  // A degree has one fixed length, so the last year is worked out, never typed.
  const duration = durations[programme] ?? null;
  const endYear = /^\d{4}$/.test(startYear) && duration ? String(Number(startYear) + duration) : "";
  const programmes = Object.keys(codes).filter((p) => offered(p, digitOk ? digit : null));
  // Year 1 is a common first year (group A or B), except for programmes that keep their own letter.
  const commonFirstYear = digit === 1 && Boolean(programme) && !firstYear.own_letter.includes(programme);
  const code = commonFirstYear ? groupLetter : codes[programme] ?? ""; // C for Computer Engineering, MCA for MCA, A or B in year 1
  const prefix = digitOk && code ? `${digit}${code}` : null;
  const chipsMode = isNew || Boolean(prefix);
  // The batch name the subbatch letters are added to (the saved name for a batch without name chips).
  const subBase = chipsMode ? (prefix ? `${prefix}${suffix.trim()}` : "") : name.trim();
  const subNames = subCount && subBase ? Array.from({ length: subCount }, (_, i) => `${subBase}${subLabel(i)}`) : [];
  const existingSub = new Set(subbatches.map((x) => x.name.toLowerCase()));

  useEffect(() => {
    if (isNew || !batch || !prefix || seeded.current === batch.id) return;
    seeded.current = batch.id;
    setSuffix(batch.name.toUpperCase().startsWith(prefix) ? batch.name.slice(prefix.length) : batch.name.replace(/^\d+[A-Za-z]*/, ""));
  }, [isNew, batch, prefix]);

  if (!isNew && loadedAt && !batch) return <Navigate to="/admin/batches" replace />;

  // Each subbatch is its own batch record named after this one (3C2 -> 3C2A, 3C2B), with the same programme and years.
  const createSubbatches = async (details) => {
    let added = 0;
    for (const subName of subNames) {
      if (existingSub.has(subName.toLowerCase())) continue;
      await createSection({ ...details, name: subName });
      added += 1;
    }
    return added;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (chipsMode) {
      if (!programme) return setMsg({ kind: "error", text: "Choose the degree programme: its letter is part of the batch name." });
      if (!/^\d{4}$/.test(startYear)) return setMsg({ kind: "error", text: "Enter the first year first: it decides the number the batch name starts with." });
      if (!digit || digit < 1) return setMsg({ kind: "error", text: "A batch starting in that year has not started yet." });
      if (digit > 9) return setMsg({ kind: "error", text: "That batch started too long ago for a one-digit year." });
    }
    const clean = chipsMode ? `${digit}${code}${suffix.trim()}` : name.trim();
    if (chipsMode ? !suffix.trim() : !clean) return setMsg({ kind: "error", text: "Give the batch a name, for example 3C23." });
    if (!programme) return setMsg({ kind: "error", text: "Choose the degree programme." });
    const from = Number(startYear);
    const to = Number(endYear);
    if (!/^\d{4}$/.test(startYear) || !/^\d{4}$/.test(endYear)) return setMsg({ kind: "error", text: "Enter the first year and choose a degree programme: the last year follows from them." });
    if (to <= from || to - from > 7) return setMsg({ kind: "error", text: "The last year must come after the first, within 7 years." });
    const details = { name: clean, degreeProgramme: programme, startYear: from, endYear: to };
    setBusy(true);
    setMsg(null);
    try {
      if (isNew) {
        const created = await createSection(details);
        await createSubbatches(details);
        await refresh();
        navigate(`/admin/batches/${created.id}/edit-details`, { replace: true });
      } else {
        await updateSection(batch.id, details);
        const added = await createSubbatches(details);
        await refresh();
        setSubTo(null);
        setMsg({ kind: "ok", text: added ? `Saved. ${added} subbatch${added === 1 ? "" : "es"} added.` : "Saved." });
      }
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not save." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteSection(batch.id);
      await refresh();
      navigate("/admin/batches", { replace: true });
    } catch (err) {
      setConfirming(false);
      setBusy(false);
      setMsg({ kind: "error", text: err.message || "Could not delete the batch." });
    }
  };

  const inUse = roster.length > 0 || classes.length > 0;

  return (
    <div className={isNew ? "adm-fit adm-batch-new" : "adm-fit adm-batch-edit"}>
      <Link to="/admin/batches" className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to Batches
      </Link>
      <AdminPageHeader
        title={isNew ? "Add a batch" : batch?.name || "Batch"}
        lead={isNew ? "A batch is a group of students who share their classes, like 3C23." : "Rename the batch, see who is in it and what it studies."}
        refresh={false}
        actions={
          batch && (
            <Link to={`/admin/students/new?batch=${batch.id}`} className="db-btn adm-primary">
              <UserPlus size={15} aria-hidden="true" /> Add student
            </Link>
          )
        }
      />
      <AdminLoadState />

      {batch && (
        <div className="adm-stats db-rise" style={{ animationDelay: "40ms" }}>
          <StatTile icon={GraduationCap} label="Students" value={num(roster.length)} sub="in this batch" />
          <StatTile icon={BookOpen} label="Classes" value={num(classes.length)} sub="subjects taught" />
          <StatTile icon={BookOpen} label="Sessions" value={num(sessionCount)} sub="attendance taken" />
          <StatTile icon={Layers} label="Subbatches" value={num(subbatches.length)} sub={subbatches.length ? "click to view all" : "none yet"} to={`/admin/batches/${batch.id}/subbatches`} />
        </div>
      )}

      <div className={isNew ? "adm-grid adm-batch-wide adm-fill" : "adm-grid adm-grid-wide adm-fill"}>
        <div className="adm-col">
          <Card title="Batch details" sub="Name, degree programme and years. Names are unique, ignoring capital letters." delay={60}>
            <form className="adm-form" onSubmit={submit} noValidate>
              <div className={isNew ? "adm-batch-layout" : undefined}>
                <div className="adm-batch-fields">
              <SearchSelect
                id="bt-programme"
                label="Degree programme"
                placeholder="Choose a degree programme"
                options={programmes}
                value={programme}
                onChange={(v) => {
                  setProgramme(v);
                  setMsg(null);
                }}
                clearable={false}
              />
              <div className="adm-field">
                <label htmlFor="bt-from">Years</label>
                <div className="adm-years">
                  <input
                    id="bt-from"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2024"
                    aria-label="First year"
                    value={startYear}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setStartYear(v);
                      setMsg(null);
                      // a programme that is not offered to the new year of study is dropped
                      if (programme && !offered(programme, v.length === 4 ? yearOfStudy(Number(v)) : null)) setProgramme("");
                    }}
                  />
                  <span aria-hidden="true">to</span>
                  <input
                    id="bt-to"
                    readOnly
                    tabIndex={-1}
                    aria-label="Last year, set by the degree programme"
                    title={duration ? `Fixed: this degree lasts ${duration} years` : "Set by the degree programme"}
                    placeholder="—"
                    value={endYear}
                    className="adm-years-fixed"
                  />
                  {/^\d{4}$/.test(startYear) && /^\d{4}$/.test(endYear) && Number(endYear) > Number(startYear) && (
                    <b className="adm-years-len">{Number(endYear) - Number(startYear)} years</b>
                  )}
                </div>
                <span className="db-sm">{duration ? `${programme.replace(/ \(.*\)$/, "")} is a ${duration}-year degree, so the last year is fixed.` : "Enter the first year. The last year is fixed by the degree programme (4 years, or 2 for MCA)."}</span>
              </div>
              <div className="adm-field">
                <label htmlFor="bt-name">Batch name</label>
                {chipsMode ? (
                  <div className="adm-name-group">
                    <button
                      type="button"
                      className={`adm-name-chip ${digitOk ? "" : "off"}`}
                      title="Year of study, worked out from the first year. Click to edit the first year."
                      aria-label={digitOk ? `Year digit ${digit}. Edit the first year` : "Year digit, set by the first year. Go to the first year"}
                      onClick={() => document.getElementById("bt-from")?.focus()}
                    >
                      {digitOk ? digit : "?"}
                    </button>
                    <button
                      type="button"
                      className={`adm-name-chip ${code ? "" : "off"} ${commonFirstYear ? "toggle" : ""}`}
                      title={commonFirstYear ? "First-year group. Click to switch between A and B." : "The degree programme's letter. Click to change the programme."}
                      aria-label={
                        commonFirstYear
                          ? `First-year group ${code}. Click to switch between A and B`
                          : code
                            ? `Programme letter ${code}. Change the degree programme`
                            : "Programme letter, set by the degree programme. Go to the degree programme"
                      }
                      onClick={() => {
                        if (commonFirstYear) {
                          setGroupLetter((l) => (l === "A" ? "B" : "A"));
                          setMsg(null);
                        } else document.getElementById("bt-programme")?.focus();
                      }}
                    >
                      {code || "?"}
                      {commonFirstYear && <ArrowLeftRight size={13} aria-hidden="true" />}
                    </button>
                    <input
                      id="bt-name"
                      value={suffix}
                      onChange={(e) => { setSuffix(e.target.value); setMsg(null); }}
                      disabled={busy}
                      autoComplete="off"
                      placeholder="e.g. 23"
                      maxLength={30}
                    />
                  </div>
                ) : (
                  <input id="bt-name" value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} disabled={busy} autoComplete="off" placeholder="e.g. 3C23" maxLength={40} />
                )}
                <span className="db-sm">
                  {isNew
                    ? prefix && commonFirstYear
                      ? `First year: a common group, A or B (click the letter to switch). The name starts with ${prefix}${suffix.trim() ? ` and will be ${prefix}${suffix.trim()}` : ""}.`
                      : prefix
                      ? `Year ${digit} (started ${startYear}) + ${code} for ${programme.replace(/ \(.*\)$/, "")}: the name starts with ${prefix}${suffix.trim() ? ` and will be ${prefix}${suffix.trim()}` : ""}.`
                      : digit !== null && digit < 1
                        ? "That year has not started yet. Use a first year that is this academic year or earlier."
                        : "The name starts with the year of study (from the first year below) and the degree programme's letter."
                    : chipsMode
                      ? batch && `${prefix}${suffix.trim()}` !== batch.name
                        ? `Saving renames this batch from ${batch.name} to ${prefix}${suffix.trim()}.`
                        : `Year ${digit} + ${code}: the name starts with ${prefix}.`
                      : null}
                </span>
              </div>
              {!parent && (
                <div className="adm-field">
                  <label>Subbatches (optional)</label>
                  <div className="adm-sub-row">
                    <div className="adm-sub-slot">
                      <span className="adm-sub-base">{subBase || "—"}</span>
                      <div className="adm-count fixed"><input readOnly aria-label="First subbatch, always the first letter or number" value={subLabel(0)} /></div>
                    </div>
                    <span aria-hidden="true" className="adm-sub-to">to</span>
                    <div className="adm-sub-slot">
                      <span className="adm-sub-base">{subBase || "—"}</span>
                      <div className="adm-count">
                        <input readOnly aria-label="Last subbatch" value={subTo === null ? "_" : subLabel(subTo)} />
                        <span className="adm-count-chev">
                          <button type="button" aria-label="Later last subbatch" disabled={(subTo ?? -1) + 1 >= MAX_SUB} onClick={() => stepTo(1)}><ChevronUp size={14} aria-hidden="true" /></button>
                          <button type="button" aria-label="Earlier last subbatch" disabled={subTo === null} onClick={() => stepTo(-1)}><ChevronDown size={14} aria-hidden="true" /></button>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="adm-name-chip toggle"
                      title="Switch between letters (A, B, C) and numbers (1, 2, 3)"
                      aria-label={`Subbatch names use ${subStyle === "letter" ? "letters" : "numbers"}. Click to switch`}
                      onClick={() => setSubStyle((s) => (s === "letter" ? "number" : "letter"))}
                    >
                      {subStyle === "letter" ? "A–Z" : "1–9"}
                      <ArrowLeftRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                  <span className="db-sm">
                    {subCount
                      ? `${isNew ? "This batch will have" : "Will add"} ${subCount} subbatch${subCount === 1 ? "" : "es"}: ${subNames.join(", ")}.`
                      : subbatches.length
                        ? `Existing: ${subbatches.map((x) => x.name).join(", ")}. Set a range to add more.`
                        : "Set where the subbatches start and end, like 3Q3A to 3Q3D. Leave empty if the batch is not split."}
                  </span>
                </div>
              )}
                </div>
                {isNew && (
                  <aside className="adm-batch-preview" aria-label="Batch preview">
                    <span className="adm-bp-label">Batch preview</span>
                    <b className="adm-bp-name" aria-live="polite">{prefix ? `${prefix}${suffix.trim()}` : "—"}</b>
                    <dl>
                      <div><dt>Degree programme</dt><dd>{programme || "—"}</dd></div>
                      <div><dt>Years</dt><dd>{/^\d{4}$/.test(startYear) && /^\d{4}$/.test(endYear) ? `${startYear}–${endYear}` : "—"}</dd></div>
                      <div><dt>Subbatches</dt><dd>{subCount ? Array.from({ length: subCount }, (_, i) => subLabel(i)).join(", ") : "None"}</dd></div>
                      <div><dt>Studying now</dt><dd>{digitOk ? `Year ${digit}` : "—"}</dd></div>
                    </dl>
                  </aside>
                )}
              </div>
              <div className="adm-form-foot">
                <FormMessage msg={msg} />
                <Link to="/admin/batches" className="db-btn">Cancel</Link>
                <button type="submit" className="db-btn adm-primary" disabled={busy}>
                  {isNew ? <Plus size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                  {busy ? "Saving…" : isNew ? "Add batch" : "Save changes"}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {batch && (
          <div className="adm-col">
            {parent && (
              <p className="db-sm">Subbatch of <Link className="adm-link" to={`/admin/batches/${parent.id}/edit-details`}>{parent.name}</Link></p>
            )}
            <Card title="Subjects" sub="Subjects taught to this batch." className="adm-subjects-card" delay={140}>
              {classes.length ? (
                <ul className="adm-linklist">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <Link to={`/admin/subjects/${encodeURIComponent(subjectKey(c))}/edit-details`}>
                        <b>{c.course}</b>
                        <span className="db-sm">{teacherName(userById, c.teacher_id)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon={BookOpen} title="No subjects yet">Add a subject to this batch from Subjects.</Empty>
              )}
            </Card>
            <Card title="Delete batch" className="adm-card-danger" delay={180}>
              <p className="db-sm">
                {inUse ? "A batch can only be deleted when it has no students and no classes." : "This batch is empty. Deleting it cannot be undone."}
              </p>
              <button type="button" className="db-btn adm-danger" onClick={() => setConfirming(true)} disabled={busy || inUse}>
                <Trash2 size={15} aria-hidden="true" /> Delete {batch.name}
              </button>
            </Card>
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog title={`Delete ${batch.name}?`} confirmLabel="Delete batch" busy={busy} onConfirm={remove} onClose={() => setConfirming(false)}>
          This is <b>permanent</b>. The empty batch {batch.name} will be removed.
        </ConfirmDialog>
      )}
    </div>
  );
}

export default AdminBatchPage;
