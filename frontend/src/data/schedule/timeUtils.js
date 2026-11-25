// Small time helpers shared by the teacher's Classes / Class Schedule pages and the student timetable.
export const HEALTHY_ATTENDANCE = 85; // the target attendance (%) the Classes page compares against

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

export const toClock = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const endTime = (slot) => toClock(toMinutes(slot.start) + slot.dur);
