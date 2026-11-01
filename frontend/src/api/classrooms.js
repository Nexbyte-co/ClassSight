import { api } from "./client";

export function listClassrooms() {
  return api.get("/classrooms");
}

export function getClassroom(classroomId) {
  return api.get(`/classrooms/${classroomId}`);
}

export function createClassroom({ course, section, teacherId }) {
  return api.post("/classrooms", { course, section, teacher_id: teacherId });
}

export function listStudents(classroomId) {
  return api.get(`/classrooms/${classroomId}/students`);
}

export function createStudent(classroomId, { rollNumber, name }) {
  return api.post(`/classrooms/${classroomId}/students`, { roll_number: rollNumber, name });
}

export function getStudent(classroomId, studentId) {
  return api.get(`/classrooms/${classroomId}/students/${studentId}`);
}

// `photos` are Blob/File objects (1-5 photos, one person each). Re-enrolling replaces the old ones.
export function enrollFace(classroomId, studentId, photos) {
  const form = new FormData();
  photos.forEach((photo, index) => form.append("files", photo, photo.name || `photo-${index + 1}.jpg`));
  return api.post(`/classrooms/${classroomId}/students/${studentId}/face`, form, { isFormData: true });
}

export function deleteFace(classroomId, studentId) {
  return api.delete(`/classrooms/${classroomId}/students/${studentId}/face`);
}

// One captured photo -> who is it among this class's enrolled students.
export function verifyPhoto(classroomId, photo) {
  const form = new FormData();
  form.append("file", photo, photo.name || "capture.jpg");
  return api.post(`/classrooms/${classroomId}/verify`, form, { isFormData: true });
}
