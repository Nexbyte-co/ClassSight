// src/pages/Home/landing/HowItWorks.jsx
import { useRef } from "react";
import { ClipboardCheck, ScanFace, UserRoundCheck } from "lucide-react";
import { Reveal } from "./motion";
import { useInView } from "./hooks";

const STEPS = [
  {
    Icon: ClipboardCheck,
    title: "Faculty starts attendance",
    text: "Open a session for the class and add a photo of the room.",
  },
  {
    Icon: ScanFace,
    title: "Students are verified",
    text: "Faces in the photo are matched to enrolled students. Unclear faces wait for the teacher instead of being guessed.",
  },
  {
    Icon: UserRoundCheck,
    title: "Records are updated",
    text: "The teacher resolves anything left, confirms, and the class record is saved.",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const shown = useInView(ref, { threshold: 0.35, once: true });

  return (
    <section className="lp-section" id="how" aria-labelledby="lp-how-title">
      <Reveal className="lp-head">
        <p className="lp-eyebrow">How it works</p>
        <h2 id="lp-how-title">From photo to record in three steps.</h2>
      </Reveal>

      <ol className={`lp-steps ${shown ? "in" : ""}`} ref={ref}>
        <span className="lp-steps-line" aria-hidden="true"><i /></span>
        {STEPS.map(({ Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 140} className="lp-step">
            <span className="lp-step-ico">
              <Icon size={22} strokeWidth={2} />
              <em>{i + 1}</em>
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
