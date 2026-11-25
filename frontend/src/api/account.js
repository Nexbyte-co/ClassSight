import { api, setToken } from "./client";

// The signed-in person's own account. Staff use /auth/..., students /student/...
const base = (student) => (student ? "/student" : "/auth");

// Keep the new token where the old one was ("remember me" = localStorage).
function keepToken({ access_token: token }) {
  let remember = true;
  try {
    remember = Boolean(localStorage.getItem("classsight_access_token"));
  } catch {
    remember = false;
  }
  setToken(token, { remember });
}

/** Change my password. Other devices are signed out; this one gets a fresh token. */
export async function changePassword({ student = false, currentPassword, newPassword }) {
  keepToken(await api.post(`${base(student)}/password`, { current_password: currentPassword, new_password: newPassword }));
}

/** Sign out every other browser/device; this one stays signed in. */
export async function signOutOtherDevices({ student = false } = {}) {
  keepToken(await api.post(`${base(student)}/logout-others`));
}

/** My sign-ins over the last 30 days (newest first, at most 20). */
export const listMyLogins = ({ student = false } = {}) => api.get(`${base(student)}/logins`);
