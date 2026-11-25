import { api } from "./client";

// What a teacher can ask an admin to change (value -> label). Same list as GET /request-kinds.
export const REQUEST_KINDS = [
  { value: "face_reenroll", label: "Enroll face again" },
  { value: "batch_change", label: "Batch change" },
  { value: "degree_programme", label: "Degree programme" },
  { value: "nfc_card", label: "NFC card problem" },
  { value: "subject_add", label: "Subject to add" },
  { value: "schedule_change", label: "Schedule change" },
  { value: "other", label: "Other" },
];

export const requestKindLabel = (value) => REQUEST_KINDS.find((k) => k.value === value)?.label || "Request";

// Teacher
export const sendRequest = (body) => api.post("/requests", body);
export const listMyRequests = () => api.get("/requests/mine");
export const withdrawRequest = (id) => api.delete(`/requests/${id}`);

// Admin
export const listOpenRequests = () => api.get("/requests");
export const claimRequest = (id) => api.post(`/requests/${id}/claim`);
export const releaseRequest = (id) => api.post(`/requests/${id}/release`);
export const resolveRequest = (id) => api.post(`/requests/${id}/resolve`);
export const listActivity = (days = 14) => api.get(`/activity?days=${days}`);
