// src/pages/Students/studentUiHelpers.js
// Labels, colours and formatting shared by the student portal pages.
import { useTheme } from "../../context/theme/ThemeContext";
import { STATUS } from "../../context/students/studentWeek";

export const STATUS_LABEL = {
  [STATUS.present]: "Present",
  [STATUS.absent]: "Absent",
  [STATUS.unverified]: "Unverified",
  [STATUS.upcoming]: "Upcoming",
};

// studentWeek's requirement levels, in the words the portal uses
export const LEVEL_LABEL = { safe: "Healthy", warning: "Warning", critical: "Critical" };
export const LEVEL_TONE = { safe: "ok", warning: "warn", critical: "bad" };

/** Returns a function that gives a course its colour for the current theme. */
export function useCourseColor(courses) {
  const { isDarkMode } = useTheme();
  return (code) => {
    const c = courses.find((x) => x.code === code);
    return c ? (isDarkMode ? c.darkColor : c.color) : "var(--cs-text-muted)";
  };
}

export function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
