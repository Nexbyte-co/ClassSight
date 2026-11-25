// "Parv Rawat" -> "PR"; titles such as "Dr." or "Professor" are skipped.
export const initials = (name) =>
  String(name || "")
    .replace(/^(professor|prof\.?|dr\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
