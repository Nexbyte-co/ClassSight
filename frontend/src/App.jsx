import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Students from "./pages/Students";
import Reports from "./pages/Reports";
import AllReports from "./pages/AllReports";
import ReportDetails from "./pages/ReportDetails";
import Settings from "./pages/Settings";

import { ThemeProvider } from "./context/ThemeContext";
import { AttendanceProvider } from "./context/AttendanceContext";
import UnverifiedStudents from "./pages/UnverifiedStudents";
import VerifiedStudents from "./pages/VerifiedStudents";

function App() {
  return (
    <ThemeProvider>
      <AttendanceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/unverified" element={<UnverifiedStudents />} />
            <Route path="/attendance/verified" element={<VerifiedStudents />} />
            <Route path="/students" element={<Students />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/Reports" element={<Reports />} />
            <Route path="/reports/all" element={<AllReports />} />
            <Route path="/reports/details" element={<ReportDetails />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </BrowserRouter>
      </AttendanceProvider>
    </ThemeProvider>
  );
}

export default App;