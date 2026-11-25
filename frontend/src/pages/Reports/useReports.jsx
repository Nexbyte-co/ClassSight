// The Reports data for the signed-in teacher, built once from their real classes and saved attendance
// (shared by every Reports page through a provider).
import { createContext, useContext, useMemo } from "react";
import { useTeacherData } from "../../context/TeacherDataContext";
import { buildReports } from "./reportsData";

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const { classrooms, byClass, loading, error, reload } = useTeacherData();
  const value = useMemo(() => ({ ...buildReports(classrooms, byClass), loading, error, reload }), [classrooms, byClass, loading, error, reload]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) throw new Error("useReports must be used within a ReportsProvider");
  return context;
}
