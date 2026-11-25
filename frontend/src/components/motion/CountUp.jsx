import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Number that counts up from 0 when first shown, then updates in place
function CountUp({ value }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const animated = useRef(false);
  useEffect(() => {
    if (animated.current || prefersReducedMotion()) {
      setShown(value);
      return undefined;
    }
    animated.current = true;
    const start = performance.now();
    let frame;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

export default CountUp;
