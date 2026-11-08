// src/pages/Home/index.jsx — public landing page
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, ScanFace } from "lucide-react";
import "./Home.css";
import { useTheme } from "../../context/theme/ThemeContext";
import Hero from "./landing/Hero";
import Features from "./landing/Features";
import HowItWorks from "./landing/HowItWorks";
import Showcase from "./landing/Showcase";
import { About, Credibility, FinalCta, Footer } from "./landing/Closing";
import { SkylineDivider } from "./landing/motion";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#product", label: "Product" },
  { href: "#about", label: "About" },
];

function Home() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  // The sticky nav gets its background once the page has scrolled a little
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`home-page ${isDarkMode ? "dark-mode" : ""}`}>
      <a href="#lp-main" className="lp-skip">Skip to content</a>
      <header className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <Link
          to="/"
          className="lp-brand"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0 });
            }
          }}
          aria-label="ClassSight home"
        >
          <span className="lp-logo">
            <ScanFace size={20} strokeWidth={2.2} />
          </span>
          <span className="lp-brand-name">ClassSight</span>
        </Link>

        <nav className="lp-links" aria-label="Sections">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="lp-nav-act">
          <button
            type="button"
            className="lp-theme"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
          </button>
          <Link to="/login" className="lp-btn primary sm">Sign In</Link>
        </div>
      </header>

      <main id="lp-main">
        <Hero />
        <SkylineDivider />
        <Features />
        <SkylineDivider flip />
        <HowItWorks />
        <SkylineDivider />
        <Showcase />
        <SkylineDivider flip />
        <About />
        <Credibility />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

export default Home;
