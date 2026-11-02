// Weekly lab timetable for the faculty member, one entry per 2-period (100 min) block
// (taken from the faculty timetable sheets).

export const SLOTS = [
  { code: "UCS303P", name: "Database Management System II", sheet: "2nd Year", group: "2Q3B", gid: "2Q32", venue: "L207", day: "Mon", start: "11:20" },
  { code: "UCS303P", name: "Database Management System II", sheet: "2nd Year", group: "2Q3C", gid: "2Q33", venue: "L207", day: "Thu", start: "09:40" },
  { code: "UCS503P", name: "Software Engineering", sheet: "3rd Year", group: "3C2C", gid: "3C23", venue: "L105", day: "Mon", start: "09:40" },
  { code: "UCS503P", name: "Software Engineering", sheet: "3rd Year", group: "3C81B", gid: "3C812", venue: "L105", day: "Mon", start: "13:50" },
  { code: "UCS503P", name: "Software Engineering", sheet: "3rd Year", group: "3P1A", gid: "3P11", venue: "L501", day: "Wed", start: "09:40" },
  { code: "MCA103P", name: "Operating Systems", sheet: "PG (1 MCA)", group: "1MCA 2", gid: "", venue: "L401", day: "Tue", start: "11:20" },
  { code: "MCA103P", name: "Operating Systems", sheet: "PG (1 MCA)", group: "1MCA 5", gid: "", venue: "L101", day: "Thu", start: "13:50" },
  { code: "MCA103P", name: "Operating Systems", sheet: "PG (1 MCA)", group: "1MCA 3", gid: "", venue: "L401", day: "Fri", start: "11:20" },
].map((slot, id) => ({
  ...slot,
  id: `slot-${id}`,
  dur: 100,
  type: "Lab", // 100 min = lab, otherwise lecture
}));

// Average attendance (%) per course
const ATTENDANCE = {
  "UCS303P|Database Management System II": 88,
  "UCS503P|Software Engineering": 86,
  "MCA103P|Operating Systems": 83,
};

export const HEALTHY_ATTENDANCE = 85;

// One entry per course (a course can have several groups / slots)
export const COURSES = [];
SLOTS.forEach((slot) => {
  const key = `${slot.code}|${slot.name}`;
  let course = COURSES.find((c) => c.key === key);
  if (!course) {
    course = { key, code: slot.code, name: slot.name, att: ATTENDANCE[key], slots: 0 };
    COURSES.push(course);
  }
  course.slots += 1;
  slot.courseIndex = COURSES.indexOf(course);
  slot.att = course.att;
});

export const YEARS = ["All", "2nd Year", "3rd Year", "PG (1 MCA)"];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

export const toClock = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const endTime = (slot) => toClock(toMinutes(slot.start) + slot.dur);
