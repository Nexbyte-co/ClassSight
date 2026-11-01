import { api } from "./client";

export function listSections() {
  return api.get("/sections");
}

export function createSection(name) {
  return api.post("/sections", { name });
}

export function listSectionStudents(sectionId) {
  return api.get(`/sections/${sectionId}/students`);
}

export function createSectionStudent(sectionId, { rollNumber, name }) {
  return api.post(`/sections/${sectionId}/students`, { roll_number: rollNumber, name });
}

export function getSectionStudent(sectionId, studentId) {
  return api.get(`/sections/${sectionId}/students/${studentId}`);
}

// `photos` are Blob/File objects (1-5 photos, one person each). Re-enrolling replaces the old ones.
export function enrollSectionFace(sectionId, studentId, photos) {
  const form = new FormData();
  photos.forEach((photo, index) => form.append("files", photo, photo.name || `photo-${index + 1}.jpg`));
  return api.post(`/sections/${sectionId}/students/${studentId}/face`, form, { isFormData: true });
}

export function deleteSectionFace(sectionId, studentId) {
  return api.delete(`/sections/${sectionId}/students/${studentId}/face`);
}
