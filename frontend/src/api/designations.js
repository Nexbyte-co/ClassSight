import { api } from "./client";

// The faculty designations (ranks) a teacher can hold.
export function listDesignations() {
  return api.get("/designations");
}
