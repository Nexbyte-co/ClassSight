import { api } from "./client";

// weekday: 0 = Monday ... 6 = Sunday. Teacher: own classes; admin: all.
export function listSchedule(weekday) {
  return api.get("/lectures", { weekday });
}

export function listClassLectures(classroomId) {
  return api.get(`/classrooms/${classroomId}/lectures`);
}

// startTime / endTime: "HH:MM"
// sessionType: "lecture" (default) | "lab" | "tutorial"
export function createLecture(classroomId, { weekday, startTime, endTime, room, sessionType }) {
  return api.post(`/classrooms/${classroomId}/lectures`, {
    weekday,
    start_time: startTime,
    end_time: endTime,
    room,
    session_type: sessionType || "lecture",
  });
}

// Change any of a slot's weekday, startTime, endTime, room, sessionType.
export function updateLecture(classroomId, lectureId, { weekday, startTime, endTime, room, sessionType }) {
  const body = {};
  if (weekday !== undefined) body.weekday = weekday;
  if (startTime !== undefined) body.start_time = startTime;
  if (endTime !== undefined) body.end_time = endTime;
  if (room !== undefined) body.room = room;
  if (sessionType !== undefined) body.session_type = sessionType;
  return api.patch(`/classrooms/${classroomId}/lectures/${lectureId}`, body);
}

export function deleteLecture(classroomId, lectureId) {
  return api.delete(`/classrooms/${classroomId}/lectures/${lectureId}`);
}

// Admin: move several slots at once, all or nothing. moves: [{ lectureId, weekday, startTime, endTime }]
export function moveLectures(moves) {
  return api.patch("/lectures", {
    moves: moves.map((m) => ({ lecture_id: m.lectureId, weekday: m.weekday, start_time: m.startTime, end_time: m.endTime })),
  });
}
