import { api } from "./client";

export function listClassrooms() {
  return api.get("/classrooms");
}

export function getClassroom(classroomId) {
  return api.get(`/classrooms/${classroomId}`);
}

export function listStudents(classroomId) {
  return api.get(`/classrooms/${classroomId}/students`);
}
