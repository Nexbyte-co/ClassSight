import { api } from "./client";

export function listSections() {
  return api.get("/sections");
}

// A batch: its name, degree programme and the years it studies (e.g. 2024 to 2028).
const batchBody = ({ name, degreeProgramme, startYear, endYear }) => ({
  name,
  degree_programme: degreeProgramme || "",
  start_year: startYear || null,
  end_year: endYear || null,
});

export function createSection(batch) {
  return api.post("/sections", batchBody(batch));
}

export function listSectionStudents(sectionId) {
  return api.get(`/sections/${sectionId}/students`);
}

export function createSectionStudent(sectionId, { rollNumber, name, email, password, subbatch }) {
  const body = { roll_number: rollNumber, name };
  if (subbatch) body.subbatch = subbatch;
  if (email) body.email = email;
  if (password) body.password = password;
  return api.post(`/sections/${sectionId}/students`, body);
}

// Any of name, rollNumber, email, password, sectionId (moves the student to another batch).
export function updateSectionStudent(sectionId, studentId, { name, rollNumber, email, password, newSectionId, subbatch }) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (rollNumber !== undefined) body.roll_number = rollNumber;
  if (email !== undefined) body.email = email || null;
  if (password) body.password = password;
  if (subbatch !== undefined) body.subbatch = subbatch;
  if (newSectionId !== undefined) body.section_id = newSectionId;
  return api.patch(`/sections/${sectionId}/students/${studentId}`, body);
}

export function deleteSectionStudent(sectionId, studentId) {
  return api.delete(`/sections/${sectionId}/students/${studentId}`);
}

export function updateSection(sectionId, batch) {
  return api.patch(`/sections/${sectionId}`, batchBody(batch));
}

export function deleteSection(sectionId) {
  return api.delete(`/sections/${sectionId}`);
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

// Admin: link an NFC ID card (serial number, any of "04:A2:3B:1C" / "04a23b1c") to a student, or unlink it.
export function linkStudentNfc(sectionId, studentId, uid) {
  return api.put(`/sections/${sectionId}/students/${studentId}/nfc`, { uid });
}

export function unlinkStudentNfc(sectionId, studentId) {
  return api.delete(`/sections/${sectionId}/students/${studentId}/nfc`);
}
