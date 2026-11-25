/* eslint-disable react-refresh/only-export-components */
// Real sign-in state: the JWT lives in localStorage (api/client.js) and /auth/me says who it is.
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getToken, getTokenRole, clearToken, UNAUTHORIZED_EVENT } from "../api/client";
import { getStudentMe } from "../api/student";
import { login, logout, getCurrentUser } from "../api/auth";

const AuthContext = createContext();

// ADMIN and TEACHER both use the teacher interface; students get the student portal. The API
// enforces what each may see.
const STAFF_ROLES = ["admin", "teacher"];

class RoleNotAllowedError extends Error {
  constructor() {
    super("This account type cannot sign in here.");
  }
}

function toSession(user) {
  if (!STAFF_ROLES.includes(user.role)) throw new RoleNotAllowedError();
  return { id: user.id, role: "teacher", apiRole: user.role, email: user.email, name: user.name, department: user.department || "", designation: user.designation || "" };
}

function toStudentSession(me) {
  return { id: me.id, role: "student", apiRole: "student", email: me.email, name: me.name, roll: me.roll_number, section: me.section_name, faceEnrolled: me.face_enrolled };
}

// Students and staff live in different tables, so "who am I" depends on the token's role.
async function loadSession() {
  if (getTokenRole() === "student") return toStudentSession(await getStudentMe());
  return toSession(await getCurrentUser());
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // True right after the user signs out, so guards send them to the landing page, not /login.
  const [signedOut, setSignedOut] = useState(false);
  // With a stored token we don't know who it is until /auth/me answers.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    loadSession()
      .then((next) => !cancelled && setSession(next))
      .catch((err) => {
        // Only a rejected token ends the session; a network blip keeps it for the next load.
        if (cancelled) return;
        if (err.status === 401 || err instanceof RoleNotAllowedError) clearToken();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Any API call that comes back 401 (expired or revoked token) signs the user out.
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Throws ApiError (wrong password, throttled, server down); returns the session on success.
  const signIn = useCallback(async (email, password, { remember = true } = {}) => {
    await login(email.trim(), password, { remember });
    setSignedOut(false);
    try {
      const next = await loadSession();
      setSession(next);
      return next;
    } catch (err) {
      clearToken(); // don't leave a token behind that the app can't use
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    logout();
    setSignedOut(true);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signedOut, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Teacher area: signed-out visitors go to the login page; admins go to their own area.
export function TeacherArea() {
  const { session, loading, signedOut } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to={signedOut ? "/" : "/login"} replace />;
  // Admin setup is a separate area from the teacher panel.
  if (session.apiRole === "admin") return <Navigate to="/admin" replace />;
  if (session.apiRole === "student") return <Navigate to="/student" replace />;
  return <Outlet />;
}

// Admin-only screens (set up teachers and classes); everyone else goes to the dashboard.
export function AdminArea() {
  const { session, loading, signedOut } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to={signedOut ? "/" : "/login"} replace />;
  if (session.apiRole === "student") return <Navigate to="/student" replace />;
  if (session.apiRole !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Student portal: students only; staff go back to their own area.
export function StudentArea() {
  const { session, loading, signedOut } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to={signedOut ? "/" : "/login"} replace />;
  if (session.apiRole !== "student") return <Navigate to={session.apiRole === "admin" ? "/admin" : "/dashboard"} replace />;
  return <Outlet />;
}

// Old /student/:studentId links go to the right home
export function LegacyStudentRedirect() {
  const { session, loading, signedOut } = useAuth();
  if (loading) return null;
  const home = session?.apiRole === "student" ? "/student" : "/dashboard";
  return <Navigate to={session ? home : signedOut ? "/" : "/login"} replace />;
}
