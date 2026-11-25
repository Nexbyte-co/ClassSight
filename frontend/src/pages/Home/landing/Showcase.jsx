// src/pages/Home/landing/Showcase.jsx
// Miniature, animated recreations of ClassSight screens. They play only while on screen,
// pause on hover/focus or with the pause button, and show their end state for reduced motion.
import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, Pause, Play, ScanFace, Users } from "lucide-react";
import { Reveal } from "./motion";
import { useInView, usePrefersReducedMotion } from "./hooks";

const STEP_MS = 1300;
const STEPS = 4; // steps per demo; one extra tick holds the end state before moving on

const TABS = [
  { key: "session", label: "Live session", Icon: Users, text: "Students move from “Needs review” to “Present” as the teacher resolves them." },
  { key: "verify", label: "Verification", Icon: ScanFace, text: "A clear match is marked present; an uncertain one is handed to the teacher." },
  { key: "reports", label: "Reports", Icon: BarChart3, text: "Attendance per group against the target, with groups below it flagged." },
];

const PRESENT = ["Aarav", "Diya", "Kabir", "Meera"];
const REVIEW = ["Ishaan", "Tara", "Vihaan"];

function SessionDemo({ step }) {
  const resolved = REVIEW.slice(0, Math.min(step, REVIEW.length));
  const waiting = REVIEW.slice(resolved.length);
  return (
    <div className="lp-demo-session">
      <div className="lane p">
        <h4>Present <b>{PRESENT.length + resolved.length}</b></h4>
        {PRESENT.map((n) => <span key={n} className="chip">{n}</span>)}
        {resolved.map((n) => <span key={n} className="chip new"><Check size={12} strokeWidth={3} />{n}</span>)}
      </div>
      <div className="lane r">
        <h4>Needs review <b>{waiting.length}</b></h4>
        {waiting.map((n, i) => <span key={n} className={`chip ${i === 0 ? "focus" : ""}`}>{n}</span>)}
        {waiting.length === 0 && <span className="done">All resolved</span>}
      </div>
      <div className="lane a">
        <h4>Absent <b>1</b></h4>
        <span className="chip">Rohan</span>
      </div>
    </div>
  );
}

function VerifyDemo({ step }) {
  const second = step >= 3;
  const result = step >= 2;
  return (
    <div className="lp-demo-verify">
      <div className={`face ${result ? (second ? "rv" : "ok") : "scan"}`}>
        <ScanFace size={46} strokeWidth={1.4} />
        <span className="ring" />
      </div>
      <div className="steps">
        <span className={step >= 0 ? "on" : ""}>Face detected</span>
        <span className={step >= 1 ? "on" : ""}>Compared with enrolled students</span>
        <span className={result ? `on res ${second ? "rv" : "ok"}` : ""}>
          {result ? (second ? "Not a clear match · sent to review" : "Clear match · marked present") : "Deciding…"}
        </span>
      </div>
    </div>
  );
}

const GROUPS = [["2Q3B", 88], ["3C2C", 86], ["1MCA 2", 83], ["3P1A", 91]];

function ReportsDemo({ step }) {
  return (
    <div className="lp-demo-reports">
      {GROUPS.map(([g, v], i) => (
        <div key={g} className={`row ${step >= 3 && v < 85 ? "flag" : ""}`}>
          <span className="g">{g}</span>
          <span className="bar">
            <i style={{ width: step > i ? `${v}%` : "0%" }} />
            <s />
          </span>
          <b>{step > i ? `${v}%` : "—"}</b>
        </div>
      ))}
      <p className="legend"><s /> 85% target</p>
    </div>
  );
}

export default function Showcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.35 });
  const reduce = usePrefersReducedMotion();
  // Tab and step move together, so one update both advances the walkthrough and switches demos
  const [{ tab, step }, setPos] = useState({ tab: 0, step: 0 });
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const playing = inView && !paused && !hold && !reduce;

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      setPos((p) => (p.step < STEPS ? { ...p, step: p.step + 1 } : { tab: (p.tab + 1) % TABS.length, step: 0 }));
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing]);

  const shownStep = reduce ? STEPS : step;
  const choose = (i) => setPos({ tab: i, step: 0 });
  const onTabKey = (e) => {
    const n = TABS.length;
    const next = { ArrowRight: (tab + 1) % n, ArrowDown: (tab + 1) % n, ArrowLeft: (tab - 1 + n) % n, ArrowUp: (tab - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    choose(next);
    document.getElementById(`lp-tab-${TABS[next].key}`)?.focus();
  };

  const Demo = [SessionDemo, VerifyDemo, ReportsDemo][tab];

  return (
    <section className="lp-section" id="product" aria-labelledby="lp-product-title">
      <Reveal className="lp-head">
        <p className="lp-eyebrow">Product</p>
        <h2 id="lp-product-title">See how it feels to use.</h2>
      </Reveal>

      <Reveal className="lp-show" delay={100}>
        <div ref={ref} className="lp-show-in">
          <div className="lp-tabs" role="tablist" aria-label="Product demos" aria-orientation="vertical" onKeyDown={onTabKey}>
            {TABS.map(({ key, label, Icon, text }, i) => (
              <button
                key={key}
                id={`lp-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={tab === i}
                aria-controls="lp-demo-panel"
                tabIndex={tab === i ? 0 : -1}
                className={tab === i ? "on" : ""}
                onClick={() => choose(i)}
              >
                <span className="ti"><Icon size={18} strokeWidth={2} /></span>
                <span className="tt">
                  <b>{label}</b>
                  <span>{text}</span>
                </span>
                {tab === i && playing && <span className="prog" key={`${tab}-${step}`} style={{ "--p": step / STEPS }} />}
              </button>
            ))}
          </div>

          <div
            className="lp-frame"
            onPointerEnter={() => setHold(true)}
            onPointerLeave={() => setHold(false)}
            onFocus={() => setHold(true)}
            onBlur={() => setHold(false)}
          >
            <div className="lp-frame-bar">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="lp-demo-tag">Illustrative demo · sample data, not live</span>
              {!reduce && (
                <button
                  type="button"
                  className="lp-pp"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play product demo" : "Pause product demo"}
                >
                  {paused ? <Play size={14} strokeWidth={2.2} /> : <Pause size={14} strokeWidth={2.2} />}
                </button>
              )}
            </div>
            <div id="lp-demo-panel" role="tabpanel" aria-labelledby={`lp-tab-${TABS[tab].key}`} className="lp-frame-body" key={tab}>
              <Demo step={shownStep} />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
