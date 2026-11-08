const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "classsight_access_token";

// Fired when the API rejects our token (expired or revoked) so the app can sign out.
export const UNAUTHORIZED_EVENT = "classsight:unauthorized";

// "Remember me" keeps the token in localStorage (survives closing the browser);
// otherwise it lives in sessionStorage and ends with the browser session.
function safeGet(storage) {
  try {
    return storage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getToken() {
  return safeGet(localStorage) || safeGet(sessionStorage);
}

export function setToken(token, { remember = true } = {}) {
  clearToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // storage blocked: the session lasts until the page is reloaded
  }
}

export function clearToken() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // storage blocked: nothing stored to clear
    }
  }
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// FastAPI sends detail as a string, or as a list of {msg} for validation errors.
function errorMessage(data, response) {
  const detail = data && typeof data === "object" ? data.detail : null;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((item) => item.msg).filter(Boolean).join("; ");
  }
  return response.statusText || "Request failed";
}

async function request(path, { method = "GET", body, params, isFormData = false } = {}) {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let requestBody;
  if (body !== undefined) {
    if (isFormData) {
      requestBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: requestBody });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(errorMessage(data, response), response.status, data);
  }

  return data;
}

export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body, options) => request(path, { method: "POST", body, ...options }),
  delete: (path) => request(path, { method: "DELETE" }),
};
