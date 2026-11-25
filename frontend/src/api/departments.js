import { api } from "./client";

export function listDepartments() {
  return api.get("/departments");
}

export function createDepartment(name) {
  return api.post("/departments", { name });
}
