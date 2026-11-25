// Web NFC (Chrome on Android, HTTPS or localhost): read the serial number (UID) of tapped NFC cards.
// Only the UID is used, so any card the phone can detect works, NDEF-formatted or not.

export const nfcSupported = () => typeof window !== "undefined" && "NDEFReader" in window;

// "04:a2:3b:1c" -> "04A23B1C", the form the API stores.
export const normalizeUid = (value) => String(value || "").replace(/[\s:-]/g, "").toUpperCase();

// "04A23B1C" -> "04:A2:3B:1C", for showing to people.
export const formatUid = (uid) => normalizeUid(uid).match(/.{1,2}/g)?.join(":") ?? "";

/**
 * Start listening for cards. Must be called from a click (the browser asks for permission the first time).
 * onCard(uid) gets every tap; the same card within `repeatMs` is ignored (one tap can be read twice).
 * Resolves to a stop() function; rejects if NFC is off, blocked or unsupported.
 */
export async function startNfcScan({ onCard, onError, repeatMs = 2500 }) {
  if (!nfcSupported()) throw new Error("This browser can't read NFC cards. Use Chrome on an Android phone with NFC on.");
  const reader = new window.NDEFReader();
  const controller = new AbortController();
  let last = { uid: "", at: 0 };
  reader.addEventListener(
    "reading",
    (event) => {
      const uid = normalizeUid(event.serialNumber);
      if (!uid) {
        onError?.("That card didn't give a serial number. Try again or mark the student by hand.");
        return;
      }
      const now = Date.now();
      if (uid === last.uid && now - last.at < repeatMs) return;
      last = { uid, at: now };
      onCard(uid);
    },
    { signal: controller.signal }
  );
  reader.addEventListener("readingerror", () => onError?.("Couldn't read that card. Hold it still on the back of the phone."), {
    signal: controller.signal,
  });
  try {
    await reader.scan({ signal: controller.signal });
  } catch (err) {
    controller.abort();
    if (err?.name === "NotAllowedError") throw new Error("NFC permission was blocked. Allow NFC for this site in Chrome's site settings.");
    if (err?.name === "NotReadableError") throw new Error("NFC is off. Turn it on in the phone's settings and try again.");
    throw new Error(err?.message || "Couldn't start the NFC reader.");
  }
  return () => controller.abort();
}
