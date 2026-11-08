// src/pages/Home/landing/motion.jsx
// Scroll-reveal wrapper and the skyline divider used between landing sections.
import { useEffect, useRef, useState } from "react";
import { useInView } from "./hooks";

/** Fades and lifts its content in the first time it scrolls into view; `delay` staggers siblings (ms). */
export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const shown = useInView(ref, { threshold: 0.15, once: true, rootMargin: "0px 0px -8% 0px" });
  // Once the entrance has played, drop the stagger delay so hover effects respond at once
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!shown) return undefined;
    const t = setTimeout(() => setSettled(true), delay + 750);
    return () => clearTimeout(t);
  }, [shown, delay]);
  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${shown ? "in" : ""} ${settled ? "settled" : ""} ${className}`}
      style={{ "--d": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Thin skyline outline that draws itself between sections. Purely decorative. */
export function SkylineDivider({ flip = false }) {
  const ref = useRef(null);
  const shown = useInView(ref, { threshold: 0.6, once: true });
  return (
    <div ref={ref} className={`lp-skyline ${shown ? "in" : ""} ${flip ? "flip" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path
          pathLength="1"
          d="M0 58 H160 V30 L200 22 V58 H300 V40 H360 V58 H520 V18 L560 12 L610 34 V58 H700 V44 L730 40 V58 H860 V24 L1000 16 V58 H1200"
        />
      </svg>
    </div>
  );
}
