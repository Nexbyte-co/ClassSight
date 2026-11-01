import { api } from "./client";

export function listUsers() {
  return api.get("/users");
}

export function createTeacher({ name, email, password }) {
  return api.post("/users", { name, email, password, role: "teacher" });
}
