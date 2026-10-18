/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import {
  defaultSessionData,
  initialVerifiedStudents,
  initialUnverifiedStudents,
  sortStudentsByRoll,
} from "../data/mockAttendance";

const AttendanceContext = createContext();

export function AttendanceProvider({ children }) {
  const [sessionData, setSessionData] = useState(() => {
    const saved = localStorage.getItem("classsight_session_data");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return defaultSessionData;
  });

  const [verifiedStudents, setVerifiedStudents] = useState(() => {
    const saved = localStorage.getItem("classsight_verified_students");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return sortStudentsByRoll(initialVerifiedStudents);
  });

  const [unverifiedStudents, setUnverifiedStudents] = useState(() => {
    const saved = localStorage.getItem("classsight_unverified_students");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return sortStudentsByRoll(initialUnverifiedStudents);
  });

  const [isSaved, setIsSaved] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("classsight_verified_students", JSON.stringify(verifiedStudents));
  }, [verifiedStudents]);

  useEffect(() => {
    localStorage.setItem("classsight_unverified_students", JSON.stringify(unverifiedStudents));
  }, [unverifiedStudents]);

  // Dynamic resolve handler (Instructions 10 & 11)
  const resolveStudent = (studentId, methodType) => {
    const targetStudent = unverifiedStudents.find((s) => s.id === studentId);
    if (!targetStudent) return;

    if (methodType === "absent") {
      // Mark as confirmed absent
      setUnverifiedStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, status: "Absent (Confirmed)" } : s
        )
      );
      return;
    }

    let methodLabel = "AI Match";
    if (methodType === "nfc") methodLabel = "NFC";
    if (methodType === "manual") methodLabel = "Manual";

    const newlyVerified = {
      ...targetStudent,
      status: "Present",
      method: methodLabel,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Remove from unverified
    setUnverifiedStudents((prev) => prev.filter((s) => s.id !== studentId));

    // Add to verified and re-sort strictly ascending by Roll No (Instruction 11)
    setVerifiedStudents((prev) => sortStudentsByRoll([...prev, newlyVerified]));
  };

  // Save Record handler (Instruction 13)
  const saveAttendanceRecord = () => {
    setIsSaved(true);
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLastSavedTimestamp(now);
    return {
      presentCount: verifiedStudents.length,
      unverifiedCount: unverifiedStudents.length,
      timestamp: now,
    };
  };

  // Reset to default initial mock dataset
  const resetAttendanceData = () => {
    setVerifiedStudents(sortStudentsByRoll(initialVerifiedStudents));
    setUnverifiedStudents(sortStudentsByRoll(initialUnverifiedStudents));
    setIsSaved(false);
    setLastSavedTimestamp(null);
  };

  return (
    <AttendanceContext.Provider
      value={{
        sessionData,
        setSessionData,
        verifiedStudents,
        unverifiedStudents,
        resolveStudent,
        saveAttendanceRecord,
        resetAttendanceData,
        isSaved,
        lastSavedTimestamp,
        totalStudentsCount: verifiedStudents.length + unverifiedStudents.length,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
}

