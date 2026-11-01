import { api } from "./client";

// weekday: 0 = Monday ... 6 = Sunday. Teacher: own classes; admin: all.
export function listSchedule(weekday) {
  return api.get("/lectures", { weekday });
}

export function listClassLectures(classroomId) {
  return api.get(`/classrooms/${classroomId}/lectures`);
}

// startTime / endTime: "HH:MM"
export function createLecture(classroomId, { weekday, startTime, endTime, room }) {
  return api.post(`/classrooms/${classroomId}/lectures`, {
    weekday,
    start_time: startTime,
    end_time: endTime,
    room,
  });
}

export function deleteLecture(classroomId, lectureId) {
  return api.delete(`/classrooms/${classroomId}/lectures/${lectureId}`);
}
