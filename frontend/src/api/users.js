import { api } from "./client";

export function listUsers() {
  return api.get("/users");
}

export function createTeacher({ name, email, password }) {
  return api.post("/users", { name, email, password, role: "teacher" });
}

// role: "teacher" | "admin". Admin only.
// A teacher may also come with a designation and classes: schedule = [{ classroomId, weekday (0 = Monday),
// startTime, endTime ("HH:MM"), room, sessionType ("lecture" | "lab" | "tutorial") }], all saved or none.
export function createUser({ name, email, password, role, department, designation, schedule }) {
  const body = { name, email, password, role, department: department || "" };
  if (designation) body.designation = designation;
  if (schedule?.length) {
    body.schedule = schedule.map((x) => ({
      classroom_id: x.classroomId,
      weekday: x.weekday,
      start_time: x.startTime,
      end_time: x.endTime,
      room: x.room || "",
      session_type: x.sessionType || "lecture",
    }));
  }
  return api.post("/users", body);
}

// Admin only: change any of a teacher's name, email, department, designation.
export function updateUser(id, { name, email, department, designation }) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (email !== undefined) body.email = email;
  if (department !== undefined) body.department = department;
  if (designation !== undefined) body.designation = designation;
  return api.patch(`/users/${id}`, body);
}

// Admin only: set a teacher's department (their subjects follow it).
export function setUserDepartment(id, department) {
  return api.patch(`/users/${id}`, { department });
}

// Admin only: set a teacher's designation (rank).
export function setUserDesignation(id, designation) {
  return api.patch(`/users/${id}`, { designation });
}

// Admin only. Permanent. Fails with 409 while the teacher still has classes.
export function deleteUser(id) {
  return api.delete(`/users/${id}`);
}

// Admin only.
export function getUser(id) {
  return api.get(`/users/${id}`);
}

// Admin only. adminPassword is the signed-in admin's own password, re-entered to confirm.
export function resetUserPassword(id, { newPassword, adminPassword }) {
  return api.put(`/users/${id}/password`, { new_password: newPassword, admin_password: adminPassword });
}
