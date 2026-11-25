// src/pages/AttendanceSession/ClassPhotoCard.jsx — one photo of the whole class: everyone the
// server recognises is marked present; the rest go to Needs review.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, CircleAlert, Image, Smartphone, X } from "lucide-react";
import CameraCapture from "../../components/CameraCapture";
import NfcTapPanel from "./NfcTapPanel";

export default function ClassPhotoCard({ scanning, scanError, scannedAt, unrecognizedFaces, locked, onPhoto, nfc }) {
  const [open, setOpen] = useState(false); // the AI Photo Scan window
  const [cameraOn, setCameraOn] = useState(false);
  const [nfcOn, setNfcOn] = useState(false);
  const closeWindow = () => {
    setOpen(false);
    setCameraOn(false);
  };
  const take = (file) => {
    closeWindow();
    onPhoto(file);
  };
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && closeWindow();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const dialog = open && (
    <div className="as-modal" onMouseDown={(e) => e.target === e.currentTarget && closeWindow()}>
      <section className="as-modal-box as-scanbox" role="dialog" aria-modal="true" aria-labelledby="as-scan-title">
        <header className="as-modal-head">
          <span className="as-modal-icon"><Camera size={19} /></span>
          <div>
            <h2 id="as-scan-title">AI Photo Scan</h2>
            <p>One photo of the whole class. Everyone recognised is marked present; the rest go to Needs review.</p>
          </div>
          <button className="as-modal-close" type="button" aria-label="Close" onClick={closeWindow}><X size={17} /></button>
        </header>
        <div className="as-pick" role="group" aria-label="How do you want to scan?">
          <button type="button" className={`as-pickb ${cameraOn ? "on" : ""}`} disabled={locked} onClick={() => setCameraOn((on) => !on)}>
            <Camera size={18} strokeWidth={2} aria-hidden="true" />
            <span><b>{cameraOn ? "Close camera" : "Take a photo"}</b><small>Use the camera now</small></span>
          </button>
          <label className={`as-pickb as-file ${locked ? "off" : ""}`}>
            <Image size={18} strokeWidth={2} aria-hidden="true" />
            <span><b>Choose a photo</b><small>Upload from this device</small></span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={locked}
              onChange={(e) => {
                const file = e.target.files[0];
                e.target.value = "";
                if (file) take(file);
              }}
            />
          </label>
        </div>
        {cameraOn && (
          <div className="as-cam">
            <CameraCapture label="Capture and scan" facingMode="environment" onCapture={take} onCancel={() => setCameraOn(false)} />
          </div>
        )}
        {scannedAt && <p className="as-rs as-lastscan">Last scan {scannedAt}</p>}
      </section>
    </div>
  );

  return (
    <section className="as-card as-photo db-rise" aria-label="Class photo">
      <div className="as-methods" role="tablist" aria-label="Attendance method">
        <span className={`as-mpill ${nfcOn ? "right" : ""}`} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={!nfcOn} className={`as-method ${!nfcOn ? "on" : ""}`} onClick={() => { setNfcOn(false); setOpen(true); }}>
          <Camera size={16} strokeWidth={2} aria-hidden="true" />
          AI Photo Scan
        </button>
        <button type="button" role="tab" aria-selected={nfcOn} className={`as-method ${nfcOn ? "on" : ""}`} onClick={() => { setNfcOn(true); closeWindow(); }}>
          <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
          NFC Library Card
        </button>
      </div>
      {nfcOn && <NfcTapPanel {...nfc} locked={locked} />}
      {dialog && createPortal(dialog, document.querySelector(".attendance-session-shell") || document.body)}
      {scannedAt && !open && <p className="as-rs as-lastscan">Last scan {scannedAt}</p>}
      <div aria-live="polite">
        {scanning && (
          <div className="as-busy" role="status">
            <span className="as-spin" aria-hidden="true" />
            Scanning the class photo…
          </div>
        )}
        {scanError && (
          <div className="as-fcm ne">
            <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
            <span>{scanError}</span>
          </div>
        )}
        {!scanning && unrecognizedFaces > 0 && (
          <div className="as-fcm wa">
            <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
            <span>
              {unrecognizedFaces} face{unrecognizedFaces === 1 ? " was" : "s were"} not matched to any enrolled student.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
