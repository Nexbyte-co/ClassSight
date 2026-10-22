// src/data/studentDemo.js
// DEMO timetable for the student portal (frontend demo only).
// Used when no recorded ClassSight sessions can be matched to the signed-in student.
// Subjects, codes and colours follow the existing Classes page demo data.

export const DEMO_SUBJECTS = [
  { code: "UCE301", name: "Data Structures", color: "#7a1515", darkColor: "#e07a7a" },
  { code: "UCE304", name: "Operating Systems", color: "#1b5e20", darkColor: "#6fcf7a" },
  { code: "UCE305", name: "Database Management", color: "#1565c0", darkColor: "#6aa9f0" },
  { code: "UMA301", name: "Discrete Mathematics", color: "#6a1b9a", darkColor: "#c084e8" },
];

// Weekly timetable: day 0 = Sunday … 6 = Saturday (no weekend classes)
export const DEMO_TIMETABLE = [
  { day: 1, code: "UCE301", start: "08:00 AM" },
  { day: 1, code: "UCE305", start: "02:00 PM" },
  { day: 2, code: "UMA301", start: "09:00 AM" },
  { day: 2, code: "UCE304", start: "10:00 AM" },
  { day: 3, code: "UCE301", start: "08:00 AM" },
  { day: 4, code: "UCE304", start: "10:00 AM" },
  { day: 4, code: "UCE305", start: "02:00 PM" },
  { day: 5, code: "UCE301", start: "08:00 AM" },
  { day: 5, code: "UMA301", start: "09:00 AM" },
];

// Weeks of demo history shown (the current week plus previous weeks)
export const DEMO_HISTORY_WEEKS = 4;
