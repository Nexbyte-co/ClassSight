import { api } from "./client";

// The fixed list of degree programmes a subject can belong to.
export function listDegreeProgrammes() {
  return api.get("/degree-programmes");
}

// Each programme's letter(s) in a batch name: { "BE Computer Engineering (TIET UG)": "C", "MCA (TIET PG)": "MCA", ... }
export function listDegreeProgrammeCodes() {
  return api.get("/degree-programmes/codes");
}

// Year-1 batches are group A or B, except the programmes in `own_letter` (they keep their own letter).
export function getFirstYearRule() {
  return api.get("/degree-programmes/first-year");
}

// Programmes only offered to batches in certain years of study: { label: [3, 4] }.
export function getYearLimits() {
  return api.get("/degree-programmes/year-limits");
}

// How many years each degree lasts: { "BE CSE (TIET UG)": 4, "MCA (TIET PG)": 2, ... }.
export function getDegreeDurations() {
  return api.get("/degree-programmes/durations");
}
