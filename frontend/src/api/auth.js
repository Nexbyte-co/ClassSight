import { api, setToken, clearToken } from "./client";

export async function login(email, password) {
  const data = await api.post("/auth/login", { email, password });
  setToken(data.access_token);
  return data;
}

export function logout() {
  clearToken();
}

export function getCurrentUser() {
  return api.get("/auth/me");
}
