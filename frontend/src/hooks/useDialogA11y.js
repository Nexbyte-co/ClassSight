// src/hooks/useDialogA11y.js
// Accessible modal behaviour: moves focus into the dialog when it opens, keeps Tab
// inside it, closes on Escape, and returns focus to the element that opened it.
import { useEffect, useRef } from "react";

// Open dialogs, innermost last: only the topmost one reacts to Escape/Tab
const openDialogs = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogA11y(isOpen, onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    const token = {};
    openDialogs.push(token);
    const focusables = () =>
      [...(dialog?.querySelectorAll(FOCUSABLE) || [])].filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Focus the first form field if there is one, otherwise the first control
    const first = dialog?.querySelector("input:not([type=hidden]), select, textarea") || focusables()[0];
    (first || dialog)?.focus();

    const onKeyDown = (e) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      } else if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      openDialogs.splice(openDialogs.indexOf(token), 1);
      document.removeEventListener("keydown", onKeyDown, true);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
