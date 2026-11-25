// Pick 1-5 face photos (files or live camera). Controlled: the parent owns the list of File objects.
// Five slots sit beside the controls: each fills with a miniature as photos are added; click one to show it in the preview.
import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import CameraCapture from "../CameraCapture";

export const MAX_FACE_PHOTOS = 5;

function FacePhotoPicker({ photos, onChange, disabled, selected = 0, onSelect, saved = [], footer }) {
  const [cameraOn, setCameraOn] = useState(false);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const add = (files) => onChange([...photos, ...files].slice(0, MAX_FACE_PHOTOS));
  const full = photos.length >= MAX_FACE_PHOTOS;

  return (
    <div className="adm-faces adm-faces-wide">
      <div className="adm-faces-side">
        <div className="adm-pw-tools">
          <label className={`db-btn adm-gen ${disabled || full ? "is-disabled" : ""}`}>
            <ImagePlus size={15} aria-hidden="true" /> Choose photos
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              disabled={disabled || full}
              onChange={(e) => {
                add([...e.target.files]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="db-btn adm-gen" onClick={() => setCameraOn((v) => !v)} disabled={disabled}>
            <Camera size={15} aria-hidden="true" /> {cameraOn ? "Close camera" : "Use camera"}
          </button>
        </div>
        <span className="db-sm">
          {photos.length}/{MAX_FACE_PHOTOS} photos. One person per photo, head and shoulders, face clearly visible.
        </span>
        {cameraOn && (
          <div className="adm-cam">
            <CameraCapture onCapture={(file) => add([file])} />
          </div>
        )}
        {footer}
      </div>
      <div className="adm-faces-slots">
        <ul className="adm-slots" aria-label="Face photos">
          {Array.from({ length: MAX_FACE_PHOTOS }, (_, i) => {
            const url = previews[i];
            return (
              <li key={url || `empty-${i}`} className={`${url ? "filled" : ""} ${url && i === selected ? "selected" : ""}`}>
                {url ? (
                  <>
                    <button type="button" className="adm-slot-pick" aria-label={`Show photo ${i + 1} in the preview`} aria-pressed={i === selected} onClick={() => onSelect?.(i)}>
                      <img src={url} alt={`New photo ${i + 1}`} />
                    </button>
                    <button type="button" className="adm-thumb-x" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(photos.filter((_, j) => j !== i))} disabled={disabled}>
                      <X size={13} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <span className="adm-slot-empty" aria-hidden="true">{i + 1}</span>
                )}
              </li>
            );
          })}
        </ul>
        {saved.length > 0 && (
          <div className="adm-saved-row">
            <span className="adm-saved-label">Current photos</span>
            <ul className="adm-thumbs adm-thumbs-sm">
              {saved.map((url) => (
                <li key={url}>
                  <img src={url} alt="Enrolled" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default FacePhotoPicker;
