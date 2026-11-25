// src/components/classes/ClassesTabs.jsx
// Tabs between the two Classes views. The sidebar's single "Classes" item covers both pages.
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Layers, CalendarDays } from "lucide-react";

const TABS = [
  { to: "/classes", label: "All Classes", Icon: Layers },
  { to: "/classes/schedule", label: "Class Schedule", Icon: CalendarDays },
];

// Resolves once the page for `to` is on screen (its tab is the active one). React Router applies
// navigations as a React transition, which flushSync does not flush, so the View Transition waits
// for the commit instead; the timeout keeps the page from freezing if it never shows up.
const waitForTab = (to) =>
  new Promise((resolve) => {
    const shown = () => document.querySelector(`.cs-tab.on[href="${to}"]`);
    if (shown()) return resolve();
    const finish = () => {
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => shown() && finish());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const timer = setTimeout(finish, 1000);
  });

export default function ClassesTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Switch tabs inside a View Transition: the browser cross-fades the page and slides the
  // underline (styles in teacher.css §24). NavLink's `viewTransition` prop needs a data router,
  // and this app uses <BrowserRouter>, so start the transition here. Without browser support,
  // or for modified clicks (new tab etc.), the link behaves normally.
  const handleClick = (e, to) => {
    if (!document.startViewTransition || to === pathname) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    document.startViewTransition(() => {
      navigate(to);
      return waitForTab(to);
    });
  };

  return (
    <nav className="cs-tabs" aria-label="Classes views">
      {TABS.map(({ to, label, Icon }) => (
        // `end`: /classes must not also match /classes/schedule
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => `cs-tab ${isActive ? "on" : ""}`}
          onClick={(e) => handleClick(e, to)}
        >
          {({ isActive }) => (
            <>
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              {label}
              {isActive && <span className="cs-tab-ink" aria-hidden="true" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
