import { api } from "./client";

export function listLogs(classroomId) {
  return api.get("/attendance/logs", { classroom_id: classroomId });
}


// One session per class per day; the API answers 409 if today's already exists.
export function createSession(classroomId, sessionDate) {
  return api.post("/attendance/session", { classroom_id: classroomId, session_date: sessionDate });
}

export function uploadSessionPhoto(sessionId, photo) {
  const form = new FormData();
  form.append("file", photo, photo.name || "class-photo.jpg");
  return api.post(`/attendance/upload?session_id=${sessionId}`, form, { isFormData: true });
}

// Runs face recognition on the uploaded photo: { recognized_students, unrecognized_face_count }.
export function processSession(sessionId) {
  return api.post(`/attendance/process?session_id=${sessionId}`);
}

// `records`: [{ student_id, status: "present" | "absent" | "excused", recognition_confidence? }].
// Replaces everything saved for the session.
export function confirmSession(sessionId, records) {
  return api.post(`/attendance/confirm?session_id=${sessionId}`, { records });
}

// Who a tapped NFC card belongs to in this class: { student_id, roll_number, name }.
// 404 = card not linked to anyone; 422 = the student isn't in this class. Nothing is saved.
export function nfcTap(classroomId, uid) {
  return api.post(`/attendance/nfc?classroom_id=${classroomId}`, { uid });
}
