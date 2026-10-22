const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "classsight_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
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

  const response = await fetch(url, { method, headers, body: requestBody });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && data.detail) || response.statusText || "Request failed";
    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body, options) => request(path, { method: "POST", body, ...options }),
};
