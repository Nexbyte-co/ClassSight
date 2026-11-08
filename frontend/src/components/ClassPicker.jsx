import { useClassroom } from "../context/ClassroomContext";

// Shown only when the user can see more than one class (admins, mostly).
function ClassPicker() {
  const { classrooms, classroom, selectClassroom } = useClassroom();
  if (classrooms.length < 2) return null;
  return (
    <select
      className="class-picker"
      aria-label="Select class"
      value={classroom?.id ?? ""}
      onChange={(e) => selectClassroom(Number(e.target.value))}
    >
      {classrooms.map((c) => (
        <option key={c.id} value={c.id}>
          {c.course} - {c.section}
        </option>
      ))}
    </select>
  );
}

export default ClassPicker;
