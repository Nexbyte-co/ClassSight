// src/pages/Home/landing/Features.jsx
// Bento grid of the three core capabilities, each with a small product visual (sample data).
import { BarChart3, Camera, Check, Fingerprint, ScanFace } from "lucide-react";
import { Reveal } from "./motion";

// Abstract classroom seats for the attendance visual: [x, y, state]
const SEATS = [
  [8, 22, "p"], [24, 18, "p"], [40, 22, "p"], [56, 18, "r"], [72, 22, "p"], [88, 18, "p"],
  [16, 58, "p"], [32, 54, "a"], [48, 58, "p"], [64, 54, "p"], [80, 58, "p"],
];

const WEEK = [
  ["Mon", 91], ["Tue", 84], ["Wed", 88], ["Thu", 79], ["Fri", 86],
];

export default function Features() {
  return (
    <section className="lp-section" id="features" aria-labelledby="lp-features-title">
      <Reveal className="lp-head">
        <p className="lp-eyebrow">What it does</p>
        <h2 id="lp-features-title">Three things, done carefully.</h2>
        <p>ClassSight focuses on the attendance work teachers repeat every class, and keeps them in control of the result.</p>
      </Reveal>

      <div className="lp-bento">
        <Reveal as="article" className="lp-card lp-f-att" delay={0}>
          <div className="lp-card-tx">
            <span className="lp-ico"><Camera size={20} strokeWidth={2} /></span>
            <h3>Smart Attendance</h3>
            <p>Take one photo of the class. Faces are detected and matched against the class list, so the register fills itself in.</p>
          </div>
          <div className="lp-vis lp-vis-photo" aria-hidden="true">
            <svg viewBox="0 0 96 80">
              {SEATS.map(([x, y, s], i) => (
                <g key={i} className={`seat ${s}`} style={{ "--i": i }}>
                  <circle cx={x} cy={y} r="5" />
                  <path d={`M${x - 7} ${y + 13} q7 -8 14 0`} />
                  <rect className="box" x={x - 7.5} y={y - 7.5} width="15" height="15" rx="2" />
                </g>
              ))}
            </svg>
            <span className="lp-tag">Sample classroom</span>
          </div>
        </Reveal>

        <Reveal as="article" className="lp-card lp-f-ver" delay={90}>
          <div className="lp-card-tx">
            <span className="lp-ico"><Fingerprint size={20} strokeWidth={2} /></span>
            <h3>Student Verification</h3>
            <p>Each student is enrolled with up to five photos. A face is only marked when the match is clear; anything uncertain goes to the teacher to review.</p>
          </div>
          <div className="lp-vis lp-vis-ver" aria-hidden="true">
            <div className="lp-enroll">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ "--i": i }}><ScanFace size={16} strokeWidth={1.8} /></span>
              ))}
            </div>
            <div className="lp-arrow-line" />
            <div className="lp-profile"><span><ScanFace size={16} strokeWidth={2} /></span>One face profile per student</div>
            <div className="lp-arrow-line" />
            <div className="lp-ver-row ok"><Check size={14} strokeWidth={2.6} /><b>Clear match</b><span>Marked present</span></div>
            <div className="lp-ver-row rv"><span className="q">?</span><b>Not sure</b><span>Sent to review</span></div>
          </div>
        </Reveal>

        <Reveal as="article" className="lp-card lp-f-ana" delay={180}>
          <div className="lp-card-tx">
            <span className="lp-ico"><BarChart3 size={20} strokeWidth={2} /></span>
            <h3>Attendance Analytics</h3>
            <p>See attendance by class and by day against your target, and spot the groups that are slipping before it becomes a problem.</p>
          </div>
          <div className="lp-vis lp-vis-bars" aria-hidden="true">
            <div className="lp-bars">
              {WEEK.map(([d, v], i) => (
                <span key={d} className={v < 85 ? "low" : ""} style={{ "--h": `${v}%`, "--i": i }}>
                  <i />
                  <em>{d}</em>
                </span>
              ))}
              <s style={{ bottom: "85%" }}><b>85% target</b></s>
            </div>
            <span className="lp-tag">Sample week</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
