// src/pages/Home/landing/hooks.js
// Motion hooks for the landing page: viewport detection, mouse parallax and the reduced-motion preference.
import { useEffect, useState } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia(REDUCE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCE_QUERY);
    const onChange = (e) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/** True while the element is in the viewport (or, with `once`, after it first appears). */
export function useInView(ref, { threshold = 0.2, once = false, rootMargin = "0px" } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, once, rootMargin]);
  return inView;
}

/**
 * Mouse parallax: writes --mx / --my (-1…1) on the element as the pointer moves over it.
 * Layers read them in CSS, so moving the mouse never re-renders React. Off for touch and reduced motion.
 */
export function useParallax(ref) {
  const reduce = usePrefersReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !window.matchMedia("(pointer: fine)").matches) return undefined;
    let frame = 0;
    let next = null;
    const apply = () => {
      frame = 0;
      if (!next) return;
      el.style.setProperty("--mx", next.x.toFixed(3));
      el.style.setProperty("--my", next.y.toFixed(3));
    };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      next = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      next = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };
  }, [ref, reduce]);
}
