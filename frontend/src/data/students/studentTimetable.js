// src/data/students/studentTimetable.js
// Mock weekly timetable of the demo student's batch (3C23), copied from the student timetable sheet.
// Same slot shape as the teacher's data/schedule/timetable.js. Lectures are one 50 min period, practicals
// two (100 min). Codes ending in L / P are the lecture / practical of the same course (`courseCode`).

const COURSES = {
  UCS615: "Image Processing",
  UCS421: "Ethics and Risk Mitigation in AI",
  UCS503: "Software Engineering",
  UCS537: "Source Code Management",
  UCS510: "Computer Architecture and Organization",
  UCS553: "Enterprise Web Application",
  UML501: "Machine Learning",
};

// [day, start, code, room]; a trailing "P" code is a lab (practical)
const ROWS = [
  ["Mon", "08:00", "UCS615L", "LT402"],
  ["Mon", "08:50", "UCS421L", "LT402"],
  ["Mon", "09:40", "UCS503P", "SE2(L105)"],
  ["Tue", "13:00", "UML501L", "LT402"],
  ["Tue", "13:50", "UCS553L", "LT402"],
  ["Tue", "14:40", "UCS503L", "LT402"],
  ["Tue", "15:30", "UCS553P", "ES2(L402)"],
  ["Wed", "08:00", "UCS537P", "L207"],
  ["Wed", "09:40", "UCS503L", "LT402"],
  ["Wed", "10:30", "UCS421L", "LT402"],
  ["Wed", "13:00", "UCS553L", "LT402"],
  ["Wed", "13:50", "UML501L", "LT402"],
  ["Wed", "14:40", "UCS510L", "LT402"],
  ["Wed", "15:30", "UCS615P", "CG2(L430)"],
  ["Thu", "09:40", "UCS510L", "LT402"],
  ["Thu", "10:30", "UCS553L", "LT402"],
  ["Thu", "11:20", "UCS537L", "TBA"],
  ["Thu", "12:10", "UCS537L", "TBA"],
  ["Thu", "13:50", "UML501P", "PG(L313)"],
  ["Thu", "15:30", "UCS615L", "LT402"],
  ["Thu", "16:20", "UCS421L", "LT402"],
  ["Fri", "08:00", "UCS503L", "LT402"],
  ["Fri", "08:50", "UCS615L", "LT402"],
  ["Fri", "09:40", "UCS510L", "LT402"],
  ["Fri", "10:30", "UML501L", "LT402"],
];

export const STUDENT_BATCH = "3C23";

// Faculty / section per slot code, from the student's subject sheet (section 3T1 is the elective)
const FACULTY = {
  UCS510L: ["Dr. Manju", "3C23"],
  UCS553P: ["Saurabh Arora", "3C23"],
  UCS553L: ["Chinu", "3C23"],
  UCS421L: ["Sumit Bansal", "3C23"],
  UCS615L: ["Ananya Pandey", "3C23"],
  UCS615P: ["Gaurav Goyal", "3C23"],
  UML501L: ["Swati Sharma", "3C23"],
  UML501P: ["Swati Sharma", "3C23"],
  UCS503P: ["Jhonsy Bansal", "3C23"],
  UCS503L: ["Stuti Chug", "3C23"],
  UCS537L: ["Mr. Gurpal Singh Chhabra", "3T1"],
  UCS537P: ["Mr. Gurpal Singh Chhabra", "3T1"],
};

export const STUDENT_SLOTS = ROWS.map(([day, start, code, venue], id) => {
  const practical = code.endsWith("P");
  const courseCode = code.slice(0, -1);
  return {
    id: `stu-slot-${id}`,
    code,
    courseCode,
    name: COURSES[courseCode],
    sheet: "3rd Year",
    group: FACULTY[code][1],
    gid: FACULTY[code][1],
    instructor: FACULTY[code][0],
    venue,
    day,
    start,
    dur: practical ? 100 : 50,
    type: practical ? "Lab" : "Lecture",
  };
});
