// Live camera preview with a Capture button. Needs HTTPS or localhost (browser rule); when the
// camera is missing or blocked it says so, and the page's file picker still works.
import { useEffect, useRef, useState } from "react";

function CameraCapture({ onCapture, onCancel, label = "Take photo" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser or connection does not allow camera access (HTTPS is required).");
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => setError("Camera not available or permission denied. Use the file picker instead."));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="mg-camera">
      {error ? (
        <div className="mg-alert warn">{error}</div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted />
      )}
      <div className="mg-modal-foot" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="mg-btn" onClick={capture} disabled={!ready}>
          {label}
        </button>
        {onCancel && (
          <button type="button" className="mg-btn secondary" onClick={onCancel}>
            Close camera
          </button>
        )}
      </div>
    </div>
  );
}

export default CameraCapture;
