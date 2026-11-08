// Keeps pages/Admin.jsx identical to develop's. On this branch Admin.jsx is the
// "class setup" page inside the admin area (AdminLayout supplies the header and
// sidebar), so PageShell only provides the styles that page expects and a link back.
// develop's crumb / activePage / showClassPicker props are intentionally ignored.
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../pages/Students/Students.css";
import "../pages/Manage.css";
import { useTheme } from "../context/theme/ThemeContext";

function PageShell({ children }) {
  const { isDarkMode } = useTheme();
  return (
    <div className={`students-page-root adm-embed ${isDarkMode ? "dark-mode" : ""}`}>
      <Link to="/admin/classes" className="adm-back">
        <ArrowLeft size={15} aria-hidden="true" /> Classes &amp; Subjects
      </Link>
      <div className="students-main-content">{children}</div>
    </div>
  );
}

export default PageShell;
