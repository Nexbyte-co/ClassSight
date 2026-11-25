import { api } from "./client";

export function listClassrooms() {
  return api.get("/classrooms");
}

export function getClassroom(classroomId) {
  return api.get(`/classrooms/${classroomId}`);
}

// [{ programme, startYear }] -> the API shape; a blank startYear is left out.
const toProgramme = (p) => ({ degree_programme: p.programme, ...(p.startYear ? { start_year: Number(p.startYear) } : {}) });

export function createClassroom({ course, section = "", teacherId, courseCode, department, types, category, degreeProgramme, programmes, subbatch }) {
  const body = { course, section };
  if (subbatch) body.subbatch = subbatch;
  if (teacherId != null) body.teacher_id = teacherId;
  if (degreeProgramme) body.degree_programme = degreeProgramme;
  if (programmes?.length) body.programmes = programmes.map(toProgramme);
  if (category) body.category = category;
  if (types) {
    body.lecture_count = types.lecture;
    body.lab_count = types.lab;
    body.tutorial_count = types.tutorial;
  }
  if (courseCode) body.course_code = courseCode;
  if (department) body.department = department;
  return api.post("/classrooms", body);
}

// Admin only: give a class to another teacher.
export function assignClassroomTeacher(classroomId, teacherId) {
  return api.patch(`/classrooms/${classroomId}`, { teacher_id: teacherId });
}

// Admin only: take a class off its teacher (it keeps its timetable slots).
export function unassignClassroom(classroomId) {
  return api.patch(`/classrooms/${classroomId}`, { teacher_id: null });
}

// Admin only: rename a subject, change its code, its degree programmes and/or attach an existing batch to it.
// programmes replaces the whole list: [{ programme, startYear }].
export function updateClassroom(classroomId, { course, courseCode, degreeProgramme, programmes, section }) {
  const body = {};
  if (course !== undefined) body.course = course;
  if (courseCode !== undefined) body.course_code = courseCode;
  if (degreeProgramme !== undefined) body.degree_programme = degreeProgramme;
  if (programmes !== undefined) body.programmes = programmes.map(toProgramme);
  if (section !== undefined) body.section = section;
  return api.patch(`/classrooms/${classroomId}`, body);
}

// Admin only: delete a class with its timetable and saved attendance.
export function deleteClassroom(classroomId) {
  return api.delete(`/classrooms/${classroomId}`);
}

// Admin only: change how many lectures, labs and tutorials a class has per week (and its category).
export function setClassroomTypes(classroomId, types, category) {
  return api.patch(`/classrooms/${classroomId}`, {
    lecture_count: types.lecture,
    lab_count: types.lab,
    tutorial_count: types.tutorial,
    category,
  });
}

export function listStudents(classroomId) {
  return api.get(`/classrooms/${classroomId}/students`);
}

// A short-lived link to an enrolled photo of a student in this class ({ url }); 404 when none is enrolled.
export function getStudentPhoto(classroomId, studentId) {
  return api.get(`/classrooms/${classroomId}/students/${studentId}/photo`);
}

// One captured photo -> who is it among this class's enrolled students.
export function verifyPhoto(classroomId, photo) {
  const form = new FormData();
  form.append("file", photo, photo.name || "capture.jpg");
  return api.post(`/classrooms/${classroomId}/verify`, form, { isFormData: true });
}
