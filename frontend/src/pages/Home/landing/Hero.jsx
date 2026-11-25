// src/pages/Home/landing/Hero.jsx
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, BadgeCheck, ScanFace } from "lucide-react";
import Building from "./Building";
import { useParallax } from "./hooks";

/** Card entrance (seconds) — tweak here */
const CARD_IN = { dur: 0.6, rise: 14, stat: 1.0, verify: 1.6, board: 2.1 };

/** One floating widget: the outer layer follows the mouse, the inner card floats on its own loop. */
function Floating({ className, depth, delay, children }) {
  return (
    <div className={`lp-float ${className}`} style={{ "--depth": depth }}>
      <div className="lp-card-in" style={{ "--card-d": `${delay}s`, "--card-dur": `${CARD_IN.dur}s`, "--card-y": `${CARD_IN.rise}px` }}>
        <div className="lp-float-in">{children}</div>
      </div>
    </div>
  );
}

export default function Hero() {
  const ref = useRef(null);
  useParallax(ref);

  return (
    <section className="lp-hero" ref={ref} aria-labelledby="lp-hero-title">
      <div className="lp-hero-text">
        <p className="lp-eyebrow lp-in" style={{ "--d": "0ms" }}>Smart classroom technology</p>
        <h1 id="lp-hero-title" className="lp-in" style={{ "--d": "80ms" }}>
          Attendance,
          <br />
          <span>simplified.</span>
        </h1>
        <p className="lp-lede lp-in" style={{ "--d": "160ms" }}>
          AI-assisted classroom attendance and verification designed for modern educational environments.
        </p>
        <div className="lp-ctas lp-in" style={{ "--d": "240ms" }}>
          <Link to="/login" className="lp-btn primary">
            Sign In
            <ArrowRight size={18} strokeWidth={2.2} />
          </Link>
          <a href="#features" className="lp-btn ghost">
            Explore ClassSight
            <ArrowDown size={17} strokeWidth={2} />
          </a>
        </div>
      </div>

      <div className="lp-hero-art">
        <div className="lp-art-stage">
          <Building />

          <Floating className="w-stat" depth={22} delay={CARD_IN.stat}>
            <span className="lp-w-k">Today’s session · L105</span>
            <span className="lp-w-row">
              <b>26</b>
              <span>of 30 present</span>
            </span>
            <span className="lp-w-bar"><i style={{ width: "86.7%" }} /></span>
          </Floating>

          <Floating className="w-verify" depth={30} delay={CARD_IN.verify}>
            <span className="lp-w-ava" aria-hidden="true"><ScanFace size={16} strokeWidth={2} /></span>
            <span className="lp-w-col">
              <b>Student verified</b>
              <span>Face match · roll 1023</span>
            </span>
            <BadgeCheck size={18} strokeWidth={2} className="lp-w-ok" aria-hidden="true" />
          </Floating>

          <Floating className="w-board" depth={18} delay={CARD_IN.board}>
            <span className="lp-w-head">
              <b>Classroom activity</b>
              <span className="lp-live-dot">Processing</span>
            </span>
            <span className="lp-w-lanes">
              <span className="p"><b>26</b>Present</span>
              <span className="r"><b>2</b>Needs review</span>
              <span className="a"><b>2</b>Absent</span>
            </span>
          </Floating>
        </div>
        <p className="lp-art-note lp-in" style={{ "--d": "200ms" }}>Illustrative preview with sample data</p>
      </div>
    </section>
  );
}
