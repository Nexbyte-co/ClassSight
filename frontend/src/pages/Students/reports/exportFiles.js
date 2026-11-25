// src/pages/Students/reports/exportFiles.js
// CSV and PDF downloads of the filtered report. The PDF is written by hand (plain text on A4 in Courier),
// so no library is needed; text is limited to ASCII.
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv({ filters, summary, rows, history, threshold }, name) {
  const lines = [
    ["ClassSight attendance report"],
    ["Semester", filters.semester],
    ["Date range", filters.range],
    ["Course", filters.course],
    ["Required attendance %", threshold],
    [],
    ["Overall attendance %", summary.pct ?? ""],
    ["Classes missed", summary.classes.absent],
    ["Eligible courses", `${summary.eligibleCourses}/${summary.courses}`],
    ["Lecture-equivalents needed to fix courses below requirement", summary.requiredUnits],
    [],
    ["Course summary (a lab counts as 2 lectures)"],
    ["Course", "Attendance %", "Attended", "Missed", "Status"],
    ...rows.map((r) => [r.name, r.pct ?? "", r.present, r.absent, r.pct === null ? "No classes held" : r.eligible ? "Eligible" : "Below requirement"]),
    [],
    ["Attendance history"],
    ["Date", "Course", "Time", "Class type", "Status"],
    ...history.map((h) => [h.dateKey, h.subject, h.time, h.kind, h.statusLabel]),
  ];
  save(new Blob([`﻿${lines.map((l) => l.map(csvCell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" }), name);
}

const ascii = (s) => String(s ?? "").replace(/[–—]/g, "-").replace(/[^\x20-\x7e]/g, "?");
const pdfText = (s) => ascii(s).replace(/([\\()])/g, "\\$1");

function buildPdf(lines) {
  const perPage = 60;
  const pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objs = [];
  const add = (body) => objs.push(body) && objs.length;
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(`<< /Type /Pages /Kids [${pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>");
  pages.forEach((chunk, i) => {
    const body = chunk
      .map((l, n) => {
        const bold = l.startsWith("#");
        return `BT /${bold ? "F2" : "F1"} ${bold ? 10 : 9} Tf 40 ${800 - n * 12.5} Td (${pdfText(bold ? l.slice(1) : l)}) Tj ET`;
      })
      .join("\n");
    const footer = `BT /F1 8 Tf 40 24 Td (ClassSight - page ${i + 1} of ${pages.length}) Tj ET`;
    const stream = `${body}\n${footer}`;
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${4 + i * 2 + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

export function downloadPdf({ filters, summary, rows, history, threshold }, name) {
  const pad = (s, n) => ascii(s).slice(0, n).padEnd(n);
  const L = [
    "#ClassSight attendance report",
    `Semester: ${filters.semester}   Range: ${filters.range}   Course: ${filters.course}`,
    `Required attendance: ${threshold}%  (a lab counts as 2 lectures)`,
    "",
    "#Summary",
    `Overall attendance ........ ${summary.pct === null ? "-" : `${summary.pct}%`}`,
    `Classes missed ............ ${summary.classes.absent}`,
    `Eligible courses .......... ${summary.eligibleCourses} of ${summary.courses}`,
    `Needed to fix courses ..... ${summary.requiredUnits} lecture-equivalents`,
    "",
    "#Course summary",
    `${pad("Course", 40)}${pad("Att %", 7)}${pad("Attended", 10)}${pad("Missed", 8)}Status`,
    ...rows.map((r) => `${pad(r.name, 40)}${pad(r.pct === null ? "-" : `${r.pct}%`, 7)}${pad(r.present, 10)}${pad(r.absent, 8)}${r.pct === null ? "No classes" : r.eligible ? "Eligible" : "Below"}`),
    "",
    "#Attendance history",
    `${pad("Date", 12)}${pad("Time", 7)}${pad("Course", 36)}${pad("Type", 9)}Status`,
    ...history.map((h) => `${pad(h.dateKey, 12)}${pad(h.time, 7)}${pad(h.subject, 36)}${pad(h.kind, 9)}${h.statusLabel}`),
  ];
  save(new Blob([buildPdf(L)], { type: "application/pdf" }), name);
}
