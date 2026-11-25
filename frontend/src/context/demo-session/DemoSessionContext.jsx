/* eslint-disable react-refresh/only-export-components */
// Mock sign-in state for the frontend demo (see demoSession.js — not real authentication)
import { createContext, useContext, useState, useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import {
  DEMO_SESSION_KEY,
  clearDemoSession,
  findDemoAccount,
  loadDemoSession,
  saveDemoSession,
  toSession,
} from "./demoSession";

const DemoSessionContext = createContext();

// localStorage (not sessionStorage): Firefox restores a history entry's sessionStorage
// on Back, which could bring a signed-out identity back. localStorage keeps sign-out final.
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function DemoSessionProvider({ children }) {
  const [session, setSession] = useState(() => loadDemoSession(getStorage()));

  // Re-read the stored identity when the browser restores this page from its back/forward
  // cache (e.g. Back after signing out) and when another tab signs in or out, so the
  // guards never keep showing a stale signed-in page.
  useEffect(() => {
    const reload = () => setSession(loadDemoSession(getStorage()));
    const handlePageShow = (e) => {
      if (e.persisted) reload();
    };
    const handleStorage = (e) => {
      if (e.key === null || e.key === DEMO_SESSION_KEY) reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Returns the matched demo account, or null for any other email
  const signIn = (email) => {
    const account = findDemoAccount(email);
    if (!account) return null;
    saveDemoSession(getStorage(), account);
    setSession(toSession(account));
    return account;
  };

  const signOut = () => {
    clearDemoSession(getStorage());
    setSession(null);
  };

  return (
    <DemoSessionContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error("useDemoSession must be used within a DemoSessionProvider");
  }
  return context;
}

// Route guards. They re-check the current demo identity on every render, so after
// sign-out (or browser Back) a protected page redirects instead of showing stale content.
// Frontend-only checks: NOT a security boundary — replace with server-side auth.

// Teacher area: signed-out visitors go to the landing page, demo students to their portal
export function TeacherArea() {
  const { session } = useDemoSession();
  if (!session) return <Navigate to="/" replace />;
  if (session.role !== "teacher") return <Navigate to="/student" replace />;
  return <Outlet />;
}

// Student portal: signed-out visitors go to the landing page, teachers to their Dashboard
export function StudentArea() {
  const { session } = useDemoSession();
  if (!session) return <Navigate to="/" replace />;
  if (session.role !== "student") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Old /student/:studentId links: teacher preview moved to /student/preview/:studentId
export function LegacyStudentRedirect() {
  const { session } = useDemoSession();
  const { studentId } = useParams();
  if (session?.role === "teacher") return <Navigate to={`/student/preview/${studentId}`} replace />;
  if (session?.role === "student") return <Navigate to="/student" replace />;
  return <Navigate to="/" replace />;
}
