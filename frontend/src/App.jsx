import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Classrooms from "./pages/Classrooms";
import Classes from "./pages/Classes";
import ClassSchedule from "./pages/ClassSchedule";
import Attendance from "./pages/Attendance";
import Students from "./pages/Students";
import Reports from "./pages/Reports";
import AllReports from "./pages/AllReports";
import ReportDetails from "./pages/ReportDetails";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Verify from "./pages/Verify";

import { ThemeProvider } from "./context/ThemeContext";
import { AttendanceProvider } from "./context/AttendanceContext";
import { ScheduleProvider } from "./context/ScheduleContext";
import { ClassroomProvider } from "./context/ClassroomContext";
import { SettingsProvider } from "./context/SettingsContext";
import {
  AdminArea,
  AuthProvider,
  LegacyStudentRedirect,
  StudentArea,
  TeacherArea,
} from "./context/AuthContext";
import {
  StudentPortalLayout,
  StudentTimetable,
  StudentAttendanceReports,
  StudentSettings,
} from "./pages/StudentPortal";
import StudentDashboard from "./pages/StudentDashboard";
// Teacher interface design system (scoped to .teacher-ui; imported last so it layers over page styles)
import "./styles/teacher.css";
import StudentOverview from "./pages/StudentOverview";
import UnverifiedStudents from "./pages/UnverifiedStudents";
import VerifiedStudents from "./pages/VerifiedStudents";

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
      <AttendanceProvider>
        <ScheduleProvider>
        <AuthProvider>
        <ClassroomProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* Teacher area: needs a valid API login, otherwise -> /login */}
            <Route element={<TeacherArea />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/classrooms" element={<Classrooms />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/schedule" element={<ClassSchedule />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/attendance/unverified" element={<UnverifiedStudents />} />
              <Route path="/attendance/verified" element={<VerifiedStudents />} />
              <Route path="/attendance/:sessionId" element={<Attendance />} />
              <Route path="/attendance/:sessionId/unverified" element={<UnverifiedStudents />} />
              <Route path="/attendance/:sessionId/verified" element={<VerifiedStudents />} />
              <Route path="/students" element={<Students />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/Reports" element={<Reports />} />
              <Route path="/reports/all" element={<AllReports />} />
              <Route path="/reports/details" element={<ReportDetails />} />
              <Route path="/settings" element={<Settings />} />
              {/* Teacher's preview of the student view (demo students) */}
              <Route path="/student/preview" element={<StudentOverview />} />
              <Route path="/student/preview/:studentId" element={<StudentOverview />} />
            </Route>
            <Route element={<AdminArea />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            {/* Student portal: no student accounts in the backend yet, so this redirects */}
            <Route element={<StudentArea />}>
              <Route path="/student" element={<StudentPortalLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="attendance-reports" element={<StudentAttendanceReports />} />
                <Route path="settings" element={<StudentSettings />} />
              </Route>
            </Route>
            <Route path="/student/:studentId" element={<LegacyStudentRedirect />} />
          </Routes>
        </BrowserRouter>
        </ClassroomProvider>
        </AuthProvider>
        </ScheduleProvider>
      </AttendanceProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;