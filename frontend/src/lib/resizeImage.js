// Shrinks a photo in the browser before upload: camera photos are 3-5 MB, but the face model
// looks at about 640 px, so a smaller JPEG is just as accurate and uploads much faster.
export const ENROLL_MAX_SIDE = 1280; // one-person photos (enrollment, verify)
export const GROUP_MAX_SIDE = 2000; // whole-class photo

function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    // imageOrientation applies the EXIF rotation phones store instead of rotating pixels
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

// Returns a JPEG File no larger than maxSide on its long edge. If the image can't be decoded
// in the browser, returns the original so the server can give its own error.
export async function resizeImage(file, maxSide = ENROLL_MAX_SIDE, quality = 0.8) {
  try {
    const bitmap = await loadBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff"; // JPEG has no transparency; keep transparent PNGs from turning black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Cuts one face out of a photo: `box` is [x1, y1, x2, y2] as fractions of the image. A margin is added
// around it so the head is not clipped. Returns a JPEG data URL, or "" if the photo can't be decoded.
export async function cropFace(file, box, margin = 0.35, maxSide = 360) {
  try {
    const bitmap = await loadBitmap(file);
    const w = bitmap.width;
    const h = bitmap.height;
    const bw = (box[2] - box[0]) * w;
    const bh = (box[3] - box[1]) * h;
    const x = Math.max(0, box[0] * w - bw * margin);
    const y = Math.max(0, box[1] * h - bh * margin);
    const cw = Math.min(w - x, bw * (1 + 2 * margin));
    const ch = Math.min(h - y, bh * (1 + 2 * margin));
    const scale = Math.min(1, maxSide / Math.max(cw, ch));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    canvas.getContext("2d").drawImage(bitmap, x, y, cw, ch, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return "";
  }
}
