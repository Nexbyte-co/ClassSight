// src/pages/Classes.jsx
import { useState, useMemo } from "react";
import {
  Search,
  X,
  BookOpen,
  Clock,
  MapPin,
  Users,
  Calendar,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import "./Classes.css";
import TeacherShell from "../components/TeacherShell";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { SLOTS, COURSES, YEARS, HEALTHY_ATTENDANCE, endTime } from "../data/timetable";

const attendanceTone = (att) => (att >= HEALTHY_ATTENDANCE ? "ok" : "warn");

function Classes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [year, setYear] = useState("All");
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SLOTS.filter(
      (o) =>
        (year === "All" || o.sheet === year) &&
        (!q || [o.code, o.name, o.venue, o.group, o.gid, o.sheet, o.day].join(" ").toLowerCase().includes(q))
    );
  }, [searchQuery, year]);

  const avgAttendance = Math.round(COURSES.reduce((sum, c) => sum + c.att, 0) / COURSES.length);
  const kpis = [
    { Icon: BookOpen, label: "Total Courses", value: COURSES.length },
    { Icon: Users, label: "Student Groups", value: SLOTS.length },
    { Icon: Clock, label: "Lectures Held", value: SLOTS.length * 8 },
    { Icon: Check, label: "Avg. Attendance", value: `${avgAttendance}%` },
  ];

  // Accessible modal behaviour (focus in, Tab trapped, Escape closes, focus returned)
  const dialogRef = useDialogA11y(Boolean(selected), () => setSelected(null));

  const overlays = selected && (
    <div className="cs-modal-backdrop" onClick={() => setSelected(null)}>
      <div
        className="cs-modal-card class-detail-modal"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-detail-title"
      >
        <div className="class-detail-header">
          <div className="class-detail-header-left">
            <div>
              <div className="class-detail-title-row">
                <h2 id="class-detail-title">{selected.name}</h2>
                <span className="class-detail-code-badge">{selected.code}</span>
              </div>
              <p className="class-detail-dept">
                {selected.sheet}
                {selected.gid ? ` · Group ${selected.gid}` : ""} · Section {selected.group}
              </p>
            </div>
          </div>
          <button type="button" className="class-detail-close" onClick={() => setSelected(null)} aria-label="Close class details">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="class-detail-info-grid">
          <div className="detail-info-item">
            <MapPin size={16} strokeWidth={2} />
            <div>
              <span className="detail-info-label">Venue</span>
              <span className="detail-info-value">{selected.venue}</span>
            </div>
          </div>
          <div className="detail-info-item">
            <Calendar size={16} strokeWidth={2} />
            <div>
              <span className="detail-info-label">When</span>
              <span className="detail-info-value">{selected.day}, {selected.start}–{endTime(selected)}</span>
            </div>
          </div>
          <div className="detail-info-item">
            <Users size={16} strokeWidth={2} />
            <div>
              <span className="detail-info-label">Format</span>
              <span className="detail-info-value">{selected.type} · {selected.dur / 50} periods ({selected.dur} min)</span>
            </div>
          </div>
          <div className="detail-info-item">
            <Clock size={16} strokeWidth={2} />
            <div>
              <span className="detail-info-label">Lectures Held</span>
              <span className="detail-info-value">8</span>
            </div>
          </div>
        </div>

        <div className={`class-detail-att-strip ${selected.att >= HEALTHY_ATTENDANCE ? "high" : "mid"}`}>
          <div className="att-strip-left">
            <span className="att-strip-label">Average Attendance</span>
            <span className="att-strip-value">{selected.att}%</span>
          </div>
          <div className="att-strip-bar-bg">
            <div className="att-strip-bar-fill" style={{ width: `${selected.att}%` }} />
          </div>
        </div>

        <div className="class-detail-footer">
          <button type="button" className="btn-class-detail-close" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <TeacherShell active="classes" overlays={overlays}>
      <main className="db-main">
        <section className="cx-panel" aria-labelledby="cx-title">
          <div className="cx-hd">
            <div className="cx-hl">
              <div className="cx-hico"><BookOpen size={26} strokeWidth={1.8} /></div>
              <div>
                <h1 className="cx-title" id="cx-title">My Classes</h1>
                <p className="cx-sub">Manage your courses, sections, and lecture schedules</p>
              </div>
            </div>
            <label className="cx-sem">
              <Calendar size={16} strokeWidth={2} className="cx-sem-ico" />
              <select aria-label="Semester" defaultValue="Spring Term 2026">
                <option>Spring Term 2026</option>
              </select>
              <ChevronDown size={14} strokeWidth={2} className="cx-sem-dd" />
            </label>
          </div>

          <div className="cx-kpis">
            {kpis.map(({ Icon, label, value }) => (
              <div className="cx-kpi" key={label}>
                <div className="cx-kpi-ico"><Icon size={22} strokeWidth={2} /></div>
                <div>
                  <div className="cx-k">{label}</div>
                  <div className="cx-n">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="cx-tools">
            <label className="cx-search">
              <Search size={16} strokeWidth={2} />
              <input
                type="search"
                placeholder="Search courses, codes, rooms..."
                aria-label="Search classes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <div className="cx-chips">
              <span className="cx-chips-lb">Year</span>
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`cx-chip ${year === y ? "on" : ""}`}
                  aria-pressed={year === y}
                  onClick={() => setYear(y)}
                >
                  {y === "All" ? "All Years" : y}
                </button>
              ))}
            </div>
          </div>

          <div className="cx-grid">
            {rows.length === 0 ? (
              <div className="cx-empty">No classes match your search.</div>
            ) : (
              rows.map((o) => {
                const tone = attendanceTone(o.att);
                return (
                  <div
                    key={o.id}
                    className="cx-card"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${o.name}, ${o.group}`}
                    onClick={() => setSelected(o)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(o);
                      }
                    }}
                  >
                    <div className="cx-bd">
                      <div className="cx-tags">
                        <span className="cd">{o.code}</span>
                        <span>{o.group}</span>
                      </div>
                      <h3>{o.name}</h3>
                      <div className="cx-dp">
                        {o.sheet}
                        {o.gid ? ` · Group ${o.gid}` : ""}
                      </div>
                      <div className="cx-meta">
                        <span><MapPin size={14} strokeWidth={2} />{o.venue}</span>
                        <span><Clock size={14} strokeWidth={2} />{o.start}–{endTime(o)}</span>
                        <span><Users size={14} strokeWidth={2} />{o.type}</span>
                      </div>
                      <div className="cx-att">
                        <div className="cx-ah">
                          <span>
                            Avg. attendance
                            <em className={tone}>{tone === "ok" ? "Healthy" : "Needs attention"}</em>
                          </span>
                          <b className={tone}>{o.att}%</b>
                        </div>
                        <div className="cx-bar"><i className={tone} style={{ width: `${o.att}%` }} /></div>
                      </div>
                      <div className="cx-days"><span>{o.day}</span></div>
                    </div>
                    <div className="cx-ft">
                      <span>{o.type} · {o.dur / 50} periods ({o.dur} min)</span>
                      <span className="go">View details<ChevronRight size={14} strokeWidth={2} /></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </TeacherShell>
  );
}

export default Classes;
