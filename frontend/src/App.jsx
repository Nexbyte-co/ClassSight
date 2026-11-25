import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Classrooms from "./pages/Classes/Classrooms";
import Classes from "./pages/Classes";
import ClassSchedule from "./pages/Classes/ClassSchedule";
import AdminTeacherSchedule from "./pages/AdminPanel/AdminTeacherSchedule";
import Attendance from "./pages/AttendanceSession";
import Students from "./pages/Students";
import Reports from "./pages/Reports";
import AllReports from "./pages/Reports/AllReports";
import ReportDetails from "./pages/Reports/ReportDetails";
import Settings from "./pages/Settings";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/AdminPanel/AdminDashboard";
import AdminTeachers from "./pages/AdminPanel/AdminTeachers";
import AdminTeacherDetail from "./pages/AdminPanel/AdminTeacherDetail";
import AdminBatches from "./pages/AdminPanel/AdminBatches";
import AdminSubjects from "./pages/AdminPanel/AdminSubjects";
import AdminStudents from "./pages/AdminPanel/AdminStudents";
import AdminStudentPage from "./pages/AdminPanel/AdminStudentPage";
import AdminBatchPage from "./pages/AdminPanel/AdminBatchPage";
import AdminTeacherAdd from "./pages/AdminPanel/AdminTeacherAdd";
import AdminSubbatches from "./pages/AdminPanel/AdminSubbatches";
import AdminSubjectPage from "./pages/AdminPanel/AdminSubjectPage";
import AdminDepartments from "./pages/AdminPanel/AdminDepartments";
import AdminSettings from "./pages/AdminPanel/AdminSettings";
import {
  AdminArea,
  AuthProvider,
  LegacyStudentRedirect,
  StudentArea,
  TeacherArea,
} from "./context/AuthContext";
import { TeacherDataProvider } from "./context/TeacherDataContext";
import { ReportsProvider } from "./pages/Reports/useReports";
import { ClassroomProvider } from "./context/ClassroomContext";

import { ThemeProvider } from "./context/theme/ThemeContext";
import { ScheduleProvider } from "./context/schedule/ScheduleContext";
import { SettingsProvider } from "./context/settings/SettingsContext";
import { StudentPortalLayout } from "./pages/Students/StudentPortal";
import StudentTimetable from "./pages/Students/StudentTimetable";
import StudentCourses from "./pages/Students/StudentCourses";
import StudentAttendance from "./pages/Students/StudentAttendance";
import StudentSettings from "./pages/Students/StudentSettings";
import StudentDashboard from "./pages/Students/StudentDashboard";
// Teacher interface design system (scoped to .teacher-ui; imported last so it layers over page styles)
import "./styles/teacher.css";

function StudentRedirect() {
  const { studentId } = useParams();
  return <Navigate to={`/admin/students/${studentId}/edit-details`} replace />;
}

function BatchRedirect() {
  const { sectionId } = useParams();
  return <Navigate to={`/admin/batches/${sectionId}/edit-details`} replace />;
}

function TeacherRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/admin/teachers/${userId}/edit-details`} replace />;
}

function SubjectRedirect() {
  const { subjectKey } = useParams();
  return <Navigate to={`/admin/subjects/${subjectKey}/edit-details`} replace />;
}

function LegacyTeacherRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/admin/teachers/${userId}/edit-details`} replace />;
}

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
        {/* ScheduleProvider reads today's lectures from the API for the signed-in user */}
        <ScheduleProvider>
        <ClassroomProvider>
        <TeacherDataProvider>
        <ReportsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* Teacher area: needs a valid API login (signed-out -> /login, admins -> /admin) */}
            <Route element={<TeacherArea />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/classrooms" element={<Classrooms />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/schedule" element={<ClassSchedule />} />
              <Route path="/attendance" element={<Attendance />} />
              {/* The old demo review pages are retired: send those URLs to the real page */}
              <Route path="/attendance/unverified" element={<Navigate to="/attendance" replace />} />
              <Route path="/attendance/verified" element={<Navigate to="/attendance" replace />} />
              {/* /attendance/<class-N_YYYY-MM-DD> opens the real attendance page for that class */}
              <Route path="/attendance/:sessionId" element={<Attendance />} />
              <Route path="/attendance/:sessionId/unverified" element={<Navigate to="/attendance" replace />} />
              <Route path="/attendance/:sessionId/verified" element={<Navigate to="/attendance" replace />} />
              <Route path="/students" element={<Students />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/Reports" element={<Reports />} />
              <Route path="/reports/all" element={<AllReports />} />
              <Route path="/reports/details" element={<ReportDetails />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* Admin area: its own layout and navigation, separate from the teacher panel */}
            <Route element={<AdminArea />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="teachers" element={<AdminTeachers />} />
                <Route path="teachers/new" element={<AdminTeacherAdd />} />
                <Route path="teachers/:userId/schedule" element={<AdminTeacherSchedule />} />
                <Route path="teachers/:userId/edit-details" element={<AdminTeacherAdd />} />
                <Route path="teachers/:userId" element={<TeacherRedirect />} />
                <Route path="batches" element={<AdminBatches />} />
                <Route path="batches/new" element={<AdminBatchPage />} />
                <Route path="batches/:sectionId/edit-details" element={<AdminBatchPage />} />
                <Route path="batches/:sectionId" element={<BatchRedirect />} />
                <Route path="batches/:sectionId/subbatches" element={<AdminSubbatches />} />
                <Route path="subjects" element={<AdminSubjects />} />
                <Route path="subjects/new" element={<AdminSubjectPage />} />
                <Route path="subjects/:subjectKey/edit-details" element={<AdminSubjectPage />} />
                <Route path="subjects/:subjectKey" element={<SubjectRedirect />} />
                <Route path="class-setup" element={<Navigate to="/admin/batches/new" replace />} />
                {/* old addresses, kept so bookmarks still work */}
                <Route path="users" element={<Navigate to="/admin/teachers" replace />} />
                <Route path="users/:userId" element={<LegacyTeacherRedirect />} />
                <Route path="classes" element={<Navigate to="/admin/batches" replace />} />
                <Route path="setup" element={<Navigate to="/admin/batches/new" replace />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="students/new" element={<AdminStudentPage />} />
                <Route path="students/:studentId/edit-details" element={<AdminStudentPage />} />
                <Route path="students/:studentId" element={<StudentRedirect />} />
                <Route path="departments" element={<AdminDepartments />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>

            {/* Student portal: no student accounts in the backend yet, so this redirects */}
            <Route element={<StudentArea />}>
              <Route path="/student" element={<StudentPortalLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="courses" element={<StudentCourses />} />
                <Route path="reports" element={<StudentAttendance />} />
                {/* Old URL from before the page was renamed Reports */}
                <Route path="attendance" element={<Navigate to="/student/reports" replace />} />
                {/* Old URL from before the portal had a dedicated Attendance page */}
                <Route path="attendance-reports" element={<Navigate to="/student/reports" replace />} />
                <Route path="settings" element={<StudentSettings />} />
              </Route>
            </Route>
            <Route path="/student/:studentId" element={<LegacyStudentRedirect />} />
          </Routes>
        </BrowserRouter>
        </ReportsProvider>
        </TeacherDataProvider>
        </ClassroomProvider>
        </ScheduleProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
