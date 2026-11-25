// src/context/students/studentOverview.js
// Pure helpers for "how many classes until / before the attendance requirement".

// Classes the student must attend in a row to reach the threshold (0 if already there)
export function classesNeededToReach(attended, total, threshold) {
  const t = threshold / 100;
  if (total <= 0 || attended / total >= t) return 0;
  if (t >= 1) return Infinity;
  return Math.ceil((t * total - attended) / (1 - t));
}

// Classes the student can still miss while staying at or above the threshold
export function classesCanMiss(attended, total, threshold) {
  const t = threshold / 100;
  if (total <= 0 || t <= 0 || attended / total < t) return 0;
  return Math.max(0, Math.floor(attended / t - total + 1e-9));
}
