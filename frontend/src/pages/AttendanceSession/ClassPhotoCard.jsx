// src/pages/AttendanceSession/ClassPhotoCard.jsx — take or upload the class photo and run face recognition
import { useState } from "react";
import { Camera, CircleAlert, Upload } from "lucide-react";
import CameraCapture from "../../components/CameraCapture";

export default function ClassPhotoCard({ disabled, scanning, error, notice, unrecognized, onScan }) {
  const [cameraOn, setCameraOn] = useState(false);

  const scan = (file) => {
    setCameraOn(false);
    onScan(file);
  };

  return (
    <section className="as-card as-face db-rise" aria-label="Class photo">
      <div className="as-ash">
        <div className="as-rt">
          <span className="as-ri2">
            <Camera size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h4>Class photo</h4>
            <div className="as-rs">Take one photo of the whole class</div>
          </div>
        </div>
      </div>
      <div className="as-fcb" style={{ flexWrap: "wrap" }}>
        <button type="button" className="as-b1" disabled={disabled || scanning} onClick={() => setCameraOn((on) => !on)}>
          <Camera size={14} strokeWidth={2.4} aria-hidden="true" />
          {cameraOn ? "Close camera" : "Open camera"}
        </button>
        <label className="as-b1" style={{ cursor: disabled || scanning ? "not-allowed" : "pointer", opacity: disabled || scanning ? 0.6 : 1 }}>
          <Upload size={14} strokeWidth={2.4} aria-hidden="true" />
          Upload photo
          <input
            type="file"
            accept="image/jpeg,image/png"
            hidden
            disabled={disabled || scanning}
            onChange={(e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (file) scan(file);
            }}
          />
        </label>
      </div>
      {cameraOn && <CameraCapture label="Capture and scan" facingMode="environment" onCapture={scan} />}
      <div aria-live="polite">
        {scanning && <div className="as-fcm wa"><span>Scanning the class photo…</span></div>}
        {error && (
          <div className="as-fcm ne">
            <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {notice && !scanning && !error && <div className="as-fcm wa"><span>{notice}</span></div>}
        {unrecognized > 0 && !scanning && (
          <div className="as-fcm wa"><span>{unrecognized} face{unrecognized === 1 ? "" : "s"} in the photo did not match anyone.</span></div>
        )}
      </div>
    </section>
  );
}
