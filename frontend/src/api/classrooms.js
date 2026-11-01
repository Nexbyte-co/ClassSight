import { api } from "./client";

export function listClassrooms() {
  return api.get("/classrooms");
}

export function getClassroom(classroomId) {
  return api.get(`/classrooms/${classroomId}`);
}

export function createClassroom({ course, section, teacherId, courseCode, department }) {
  const body = { course, section, teacher_id: teacherId };
  if (courseCode) body.course_code = courseCode;
  if (department) body.department = department;
  return api.post("/classrooms", body);
}

export function listStudents(classroomId) {
  return api.get(`/classrooms/${classroomId}/students`);
}

// One captured photo -> who is it among this class's enrolled students.
export function verifyPhoto(classroomId, photo) {
  const form = new FormData();
  form.append("file", photo, photo.name || "capture.jpg");
  return api.post(`/classrooms/${classroomId}/verify`, form, { isFormData: true });
}
