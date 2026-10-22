// src/context/demoSession.js
// MOCK role-based sign-in for the frontend demo. This is NOT authentication:
// there is no password and no server check, and anything here can be bypassed
// in the browser. Replace with server-side authentication and authorization
// before production.

export const DEMO_SESSION_KEY = "classsight_demo_session_v1";

// The only two accounts the demo recognises
export const DEMO_ACCOUNTS = [
  { email: "jhonsy.bansal@thapar.edu", role: "teacher", home: "/dashboard", name: "Professor Jhonsy" },
  { email: "prawat_be24@thapar.edu", role: "student", home: "/student", name: "Parv Rawat" },
];

export const UNKNOWN_ACCOUNT_ERROR = "Invalid email or account not recognized.";

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function findDemoAccount(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return DEMO_ACCOUNTS.find((a) => a.email === normalized) || null;
}

// Only the role and email are stored — no credentials or other personal data.
// The display name comes from the demo account list, not from storage.
export function loadDemoSession(storage) {
  try {
    const raw = storage ? storage.getItem(DEMO_SESSION_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const account = findDemoAccount(parsed?.email);
    return account && account.role === parsed?.role ? toSession(account) : null;
  } catch {
    return null;
  }
}

export function toSession(account) {
  return { role: account.role, email: account.email, name: account.name };
}

export function saveDemoSession(storage, account) {
  try {
    storage?.setItem(DEMO_SESSION_KEY, JSON.stringify({ role: account.role, email: account.email }));
  } catch {
    /* ignore */
  }
}

export function clearDemoSession(storage) {
  try {
    storage?.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
