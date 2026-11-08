// Keeps pages/Admin.jsx identical to develop's. Here "PageShell" is the standalone
// admin chrome (AdminShell), not the teacher layout; the crumb / activePage /
// showClassPicker props used on develop are intentionally ignored.
import AdminShell from "./AdminShell";

function PageShell({ children }) {
  return <AdminShell>{children}</AdminShell>;
}

export default PageShell;
