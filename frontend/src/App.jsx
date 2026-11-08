import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Classrooms from "./pages/Classes/Classrooms";
import Classes from "./pages/Classes";
import ClassSchedule from "./pages/Classes/ClassSchedule";
import Attendance from "./pages/AttendanceSession/Attendance";
import Students from "./pages/Students";
import Reports from "./pages/Reports";
import AllReports from "./pages/Reports/AllReports";
import ReportDetails from "./pages/Reports/ReportDetails";
import Settings from "./pages/Settings";

import { ThemeProvider } from "./context/theme/ThemeContext";
import { AttendanceProvider } from "./context/attendance/AttendanceContext";
import { ScheduleProvider } from "./context/schedule/ScheduleContext";
import { SettingsProvider } from "./context/settings/SettingsContext";
import {
  DemoSessionProvider,
  LegacyStudentRedirect,
  StudentArea,
  TeacherArea,
} from "./context/demo-session/DemoSessionContext";
import { StudentPortalLayout } from "./pages/Students/StudentPortal";
import StudentTimetable from "./pages/Students/StudentTimetable";
import StudentCourses from "./pages/Students/StudentCourses";
import StudentAttendance from "./pages/Students/StudentAttendance";
import StudentSettings from "./pages/Students/StudentSettings";
import StudentDashboard from "./pages/Students/StudentDashboard";
// Teacher interface design system (scoped to .teacher-ui; imported last so it layers over page styles)
import "./styles/teacher.css";
import StudentOverview from "./pages/Students/StudentOverview";
import UnverifiedStudents from "./pages/AttendanceSession/UnverifiedStudents";
import VerifiedStudents from "./pages/AttendanceSession/VerifiedStudents";

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
      <AttendanceProvider>
        <ScheduleProvider>
        <DemoSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* Teacher area (mock role check: signed-out -> "/", demo student -> /student) */}
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
              <Route path="/reports" element={<Reports />} />
              <Route path="/Reports" element={<Reports />} />
              <Route path="/reports/all" element={<AllReports />} />
              <Route path="/reports/details" element={<ReportDetails />} />
              <Route path="/settings" element={<Settings />} />
              {/* Teacher's preview of the student view (demo students) */}
              <Route path="/student/preview" element={<StudentOverview />} />
              <Route path="/student/preview/:studentId" element={<StudentOverview />} />
            </Route>
            {/* Student portal (mock role check: signed-out -> "/", teacher -> /dashboard) */}
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
        </DemoSessionProvider>
        </ScheduleProvider>
      </AttendanceProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;