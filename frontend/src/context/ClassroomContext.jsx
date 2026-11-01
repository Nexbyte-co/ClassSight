/* eslint-disable react-refresh/only-export-components */
// The classes the signed-in user can see (a teacher: their own; an admin: all) and the selected one.
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { listClassrooms } from "../api/classrooms";
import { useAuth } from "./AuthContext";

const ClassroomContext = createContext();
const SELECTED_KEY = "classsight_classroom_id";

function readStoredId() {
  try {
    return Number(localStorage.getItem(SELECTED_KEY)) || null;
  } catch {
    return null;
  }
}

export function ClassroomProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.id ?? null;
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState(readStoredId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!userId) return;
    const id = ++requestId.current; // a newer request (or account switch) makes this one stale
    setLoading(true);
    setError("");
    try {
      const list = await listClassrooms();
      if (id === requestId.current) setClassrooms(list);
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Could not load classes.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      requestId.current++;
      setClassrooms([]);
      return;
    }
    reload();
  }, [userId, reload]);

  const selectClassroom = (id) => {
    setSelectedId(id);
    try {
      localStorage.setItem(SELECTED_KEY, String(id));
    } catch {
      /* ignore */
    }
  };

  const classroom = classrooms.find((c) => c.id === selectedId) || classrooms[0] || null;

  return (
    <ClassroomContext.Provider
      value={{ classrooms, classroom, selectClassroom, loading, error, reload }}
    >
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error("useClassroom must be used within a ClassroomProvider");
  }
  return context;
}
