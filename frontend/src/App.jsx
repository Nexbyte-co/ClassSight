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
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <ThemeProvider>
      <AttendanceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/classes"
              element={
                <RequireAuth>
                  <Classes />
                </RequireAuth>
              }
            />
            <Route
              path="/attendance"
              element={
                <RequireAuth>
                  <Attendance />
                </RequireAuth>
              }
            />
            <Route
              path="/attendance/unverified"
              element={
                <RequireAuth>
                  <UnverifiedStudents />
                </RequireAuth>
              }
            />
            <Route
              path="/attendance/verified"
              element={
                <RequireAuth>
                  <VerifiedStudents />
                </RequireAuth>
              }
            />
            <Route
              path="/students"
              element={
                <RequireAuth>
                  <Students />
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <Reports />
                </RequireAuth>
              }
            />
            <Route
              path="/Reports"
              element={
                <RequireAuth>
                  <Reports />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/all"
              element={
                <RequireAuth>
                  <AllReports />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/details"
              element={
                <RequireAuth>
                  <ReportDetails />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AttendanceProvider>
    </ThemeProvider>
  );
}

export default App;