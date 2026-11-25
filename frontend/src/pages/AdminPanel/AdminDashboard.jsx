import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, BookPlus, CalendarPlus, Building2, GraduationCap, Layers, UserPlus, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "../../context/AdminDataContext";
import { listDepartments } from "../../api/departments";
import { AdminLoadState, AdminPageHeader, Card, StatTile } from "../../components/admin/ui";
import { ActivityCard, RequestsCard, useDashboardFeeds } from "../../components/admin/DashboardFeeds";
import { num, subjectKey } from "../../components/admin/format";

const QUICK_ACTIONS = [
  { to: "/admin/teachers/new", Icon: UserPlus, label: "Add a teacher", sub: "Create a teacher account" },
  { to: "/admin/batches/new", Icon: CalendarPlus, label: "Set up a class", sub: "Create a class and its lecture times" },
  { to: "/admin/subjects/new", Icon: BookPlus, label: "Create a subject", sub: "Add a subject with its code, batch and teacher" },
  { to: "/admin/students/new", Icon: GraduationCap, label: "Add a student", sub: "Enroll a student in a batch" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function AdminDashboard() {
  const { session } = useAuth();
  const { teachers, admins, classrooms, sections, students, totals, faceEnrolled } = useAdminData();
  const feeds = useDashboardFeeds();
  const [departments, setDepartments] = useState(null);
  useEffect(() => {
    let live = true;
    listDepartments()
      .then((rows) => live && setDepartments(rows))
      .catch(() => live && setDepartments([]));
    return () => {
      live = false;
    };
  }, []);
  const subjectCount = new Set(classrooms.map(subjectKey)).size;
  const topBatches = sections.filter((s) => !s.parent_id).length;
  const teacherDepts = new Set(teachers.map((t) => t.department).filter(Boolean)).size;

  return (
    <div className="adm-fit">
      <AdminPageHeader
        title={`${greeting()}, ${(session?.name || "Admin").split(" ")[0]}`}
        lead="Here's an overview of ClassSight across all classes and users."
      />
      <AdminLoadState />

      <div className="adm-stats db-rise" style={{ animationDelay: "60ms" }}>
        <StatTile to="/admin/teachers" icon={Users} label="Teachers" value={num(teachers.length)} sub={`${admins.length} administrator${admins.length === 1 ? "" : "s"}`} />
        <StatTile to="/admin/batches" icon={Layers} label="Batches" value={num(topBatches)} sub={`${num(sections.length - topBatches)} subbatch${sections.length - topBatches === 1 ? "" : "es"}`} />
        <StatTile to="/admin/subjects" icon={BookOpen} label="Subjects" value={num(subjectCount)} sub={`${num(classrooms.length)} class${classrooms.length === 1 ? "" : "es"} · ${num(totals.sessions)} sessions`} />
        <StatTile to="/admin/students" icon={GraduationCap} label="Students" value={num(students.length)} sub={`${num(faceEnrolled)} with face enrolled`} />
        <StatTile to="/admin/departments" icon={Building2} label="Departments" value={departments ? num(departments.length) : "—"} sub={`${num(teacherDepts)} with teachers`} />
      </div>

      <div className="adm-grid adm-fill adm-dash">
        <RequestsCard feeds={feeds} delay={100} />
        <Card title="Quick actions" delay={140} className="adm-dash-actions">
          <div className="adm-actions">
            {QUICK_ACTIONS.map(({ to, Icon, label, sub }) => (
              <Link key={to} to={to} className="adm-action">
                <span className="adm-action-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span>
                  <b>{label}</b>
                  <span className="db-sm">{sub}</span>
                </span>
                <ArrowRight size={18} className="adm-action-go" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Card>
        <ActivityCard feeds={feeds} delay={180} />
      </div>
    </div>
  );
}

export default AdminDashboard;
