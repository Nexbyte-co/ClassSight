// src/hooks/usePhotoRescan.js
// Simulated single-student photo re-scan used by the Resolve modal.
// The student is only verified after a valid image is chosen and the
// simulated scan completes; cancelling at any point changes nothing.
import { useState, useRef, useEffect, useCallback } from "react";

const RESCAN_DURATION_MS = 1600; // matches the Dashboard Photo Scan simulation
const MAX_PHOTO_BYTES = 20 * 1024 * 1024; // "up to 20MB"

const IDLE = { status: "idle", studentId: null };

export function usePhotoRescan(onRescanComplete) {
  const fileInputRef = useRef(null);
  const pendingStudentIdRef = useRef(null);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onRescanComplete);
  // status: "idle" | "scanning" | "invalid"
  const [rescanState, setRescanState] = useState(IDLE);

  useEffect(() => {
    onCompleteRef.current = onRescanComplete;
  });

  // Clear any pending scan on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const cancelRescan = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingStudentIdRef.current = null;
    setRescanState(IDLE);
  }, []);

  const startRescan = (studentId) => {
    pendingStudentIdRef.current = studentId;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleRescanFileChange = (e) => {
    const file = e.target.files?.[0];
    const studentId = pendingStudentIdRef.current;
    e.target.value = "";
    if (!file || !studentId) return;

    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) {
      setRescanState({ status: "invalid", studentId });
      return;
    }

    setRescanState({ status: "scanning", studentId });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingStudentIdRef.current = null;
      setRescanState(IDLE);
      onCompleteRef.current(studentId);
    }, RESCAN_DURATION_MS);
  };

  return {
    fileInputRef,
    rescanState,
    startRescan,
    cancelRescan,
    handleRescanFileChange,
  };
}
