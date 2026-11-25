// src/context/students/useMyPhoto.js — the signed-in student's enrolled photo, used as their avatar.
// Fetched once with their token and shared by every place that shows it.
import { useEffect, useState } from "react";
import { getMyPhotoBlob } from "../../api/student";

let cached = null; // { id, url }
let inflight = null;

export function useMyPhoto(session) {
  const id = session?.role === "student" ? session.id : null;
  const [url, setUrl] = useState(() => (cached && cached.id === id ? cached.url : null));
  useEffect(() => {
    if (id == null) return undefined;
    if (cached && cached.id === id) {
      setUrl(cached.url);
      return undefined;
    }
    let live = true;
    inflight = inflight ?? getMyPhotoBlob();
    inflight.then((blob) => {
      inflight = null;
      cached = { id, url: blob ? URL.createObjectURL(blob) : null };
      if (live) setUrl(cached.url);
    });
    return () => {
      live = false;
    };
  }, [id, session?.faceEnrolled]);
  return url;
}
