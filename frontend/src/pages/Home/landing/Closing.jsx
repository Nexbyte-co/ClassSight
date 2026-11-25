// src/pages/Home/landing/Closing.jsx
// About, credibility (facts taken from how ClassSight actually works, no invented numbers),
// the final call to action and the footer.
import { Link } from "react-router-dom";
import { ArrowRight, Images, Lock, ScanFace, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Reveal } from "./motion";

const FACTS = [
  {
    Icon: ShieldCheck,
    title: "A wrong match is treated as worse than a miss",
    text: "A face is only matched when it clearly beats every other student. Anything close is left for the teacher.",
  },
  {
    Icon: Images,
    title: "Up to five photos per student",
    text: "Enrollment photos are combined into one face profile, and re-enrolling replaces the old one.",
  },
  {
    Icon: UserRoundCheck,
    title: "Teachers stay in control",
    text: "Nothing is saved until the teacher has resolved the unclear faces and confirmed the record.",
  },
  {
    Icon: Lock,
    title: "Access stays with the class",
    text: "Teachers only see their own classrooms, and classroom photos are kept in private storage.",
  },
];

export function About() {
  return (
    <section className="lp-section lp-about" id="about" aria-labelledby="lp-about-title">
      <Reveal className="lp-about-in">
        <p className="lp-eyebrow">About ClassSight</p>
        <h2 id="lp-about-title">Less time on the register, more time teaching.</h2>
        <div className="lp-about-cols">
          <p>
            Calling names and passing sheets eats into every class. ClassSight turns one classroom photo into a draft register, so
            teachers spend their time on the few students who need a second look rather than on everyone.
          </p>
          <p>
            The aim is attendance that is quick to take and easy to trust: careful about uncertain matches, clear about what was
            decided, and always confirmed by the person responsible for the class.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export function Credibility() {
  return (
    <section className="lp-section" id="trust" aria-labelledby="lp-trust-title">
      <Reveal className="lp-head">
        <p className="lp-eyebrow">Built to be trusted</p>
        <h2 id="lp-trust-title">Careful by design.</h2>
      </Reveal>
      <ul className="lp-facts">
        {FACTS.map(({ Icon, title, text }, i) => (
          <Reveal as="li" key={title} delay={i * 90} className="lp-fact">
            <span className="lp-ico"><Icon size={20} strokeWidth={2} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="lp-final" aria-labelledby="lp-final-title">
      <Reveal className="lp-final-in">
        <h2 id="lp-final-title">Ready to simplify attendance?</h2>
        <p>Sign in to open your classes and start a session.</p>
        <Link to="/login" className="lp-btn white">
          Sign In
          <ArrowRight size={18} strokeWidth={2.2} />
        </Link>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-foot-brand">
        <span className="lp-logo"><ScanFace size={16} strokeWidth={2.2} /></span>
        <b>ClassSight</b>
      </div>
      <nav className="lp-foot-links" aria-label="Footer">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#product">Product</a>
        <Link to="/login">Sign In</Link>
      </nav>
      <p>© {new Date().getFullYear()} ClassSight</p>
    </footer>
  );
}
