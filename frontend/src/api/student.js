import { api, fetchBlob } from "./client";

// Student portal: everything is scoped to the signed-in student by the server.
export function getStudentMe() {
  return api.get("/student/me");
}

// The student's batch timetable and their own attendance records.
export function getStudentOverview() {
  return api.get("/student/overview");
}

// The student's own enrolled photo as a blob (their avatar); null when none is enrolled.
export function getMyPhotoBlob() {
  return fetchBlob("/student/me/photo");
}
