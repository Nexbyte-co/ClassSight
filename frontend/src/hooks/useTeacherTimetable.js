// The teacher's real weekly timetable (slots + courses) for the Classes and Class Schedule pages.
import { useMemo } from "react";
import { useTeacherData } from "../context/TeacherDataContext";
import { buildTimetable } from "../context/teacherModel";

export function useTeacherTimetable() {
  const { classrooms, byClass, loading, error, reload } = useTeacherData();
  const { slots, courses } = useMemo(() => buildTimetable(classrooms, byClass), [classrooms, byClass]);
  return { slots, courses, byClass, loading, error, reload };
}
