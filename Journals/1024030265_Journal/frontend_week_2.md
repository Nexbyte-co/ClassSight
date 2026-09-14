\definecolor{classsightmaroon}{HTML}{7A1515}
\hypersetup{colorlinks=true,linkcolor=classsightmaroon,urlcolor=classsightmaroon}
\titleformat{\section}{\bfseries\color{classsightmaroon}}{\thesection.}{0.5em}{}
\setstretch{1.15}

\title{**ClassSight**\\ Additional Engineering Problems & Solutions}
\author{}
\date{}

# Frontend Environment & Development Setup
**Problem:** The frontend initially used an outdated Node.js version (Node.js v12), which was incompatible with the modern Vite/React development environment.

**Solution:** Used NVM (Node Version Manager) to upgrade the development environment to Node.js 22. The Node.js and Python architectures and versions were verified, after which the Vite development server was successfully executed from the frontend directory.

**Result:** The ClassSight frontend could be developed and tested using the modern Vite/React toolchain at `http://localhost:5173/`.

# Frontend Routing & Page Navigation
**Problem:** The application required multiple frontend pages with independent URLs and navigation between them.

**Solution:** Configured React Router and established routes for the major ClassSight pages, including Home, Login, Dashboard, Classes/Classrooms, Attendance, Students, Analytics/Reports, and Settings.

**Result:** The major frontend modules became accessible through dedicated routes while maintaining React client-side navigation.

# Navigation Drawer Component Failure
**Problem:** The navigation drawer initially caused frontend compilation/runtime problems because of duplicate imports and conflicting component code.

**Solution:** Inspected the navigation drawer component, removed duplicate imports, and corrected the component implementation.

**Result:** The navigation component loaded correctly. The navigation design was later revised as part of the landing-page simplification.

# Landing Page Navigation Design Revision
**Problem:** The initial Home page used a hamburger button and right-side navigation drawer. This added unnecessary interaction to the public landing page and reduced its minimal appearance.

**Solution:** Removed the hamburger/drawer interaction from the public Home page and retained a simpler header containing the ClassSight identity and theme control.

**Result:** The landing page became cleaner and more focused on the product identity, hero message, and Sign In action.

# Landing Page Theme Toggle
**Problem:** After removing the hamburger navigation from the Home page, a useful and visually appropriate header interaction was still required.

**Solution:** Implemented a direct icon-only Moon/Sun theme toggle using Lucide icons.

**Result:** Users can switch between light and dark presentation directly from the landing page without opening a navigation menu.

# Landing Page Dark Mode Integration
**Problem:** The Home page required dark-mode support while preserving the existing ClassSight visual identity.

**Solution:** Added scoped dark-mode styles covering the page background, header, logo, eyebrow text, headline, description, Sign In button, and theme-toggle states.

**Result:** The landing page supports both light and dark presentation while maintaining the ClassSight maroon accent.

# Global Font Preservation
**Problem:** During UI refinement, changing the global typography could unintentionally alter the established appearance of the application.

**Solution:** The existing typography was retained. Instead of replacing the font globally, visual hierarchy was improved through appropriate font sizing, weight, spacing, and alignment.

**Result:** The established ClassSight typography remained consistent across the application.

# Login Page Frontend Implementation
**Problem:** The backend authentication system was not yet available, but the frontend required a complete login interface for development and demonstration.

**Solution:** Implemented a frontend Login page containing:
[leftmargin=*]
- College ID / Email input
- Password input
- Show/Hide password control
- Remember Me checkbox
- Forgot Password placeholder
- Sign In button
- ClassSight branding
- College Attendance System footer
**Result:** A complete authentication interface was available for frontend development without requiring the backend to be completed.

# Temporary Login Navigation Without Backend Authentication
**Problem:** The Login page needed to demonstrate the post-login workflow even though real authentication was not yet connected.

**Solution:** Implemented temporary frontend navigation where submitting the login form redirects the user to `/dashboard`. Fake credential validation was intentionally avoided.

**Result:** The frontend could demonstrate the login-to-dashboard workflow while keeping real authentication deferred to the backend.

# Backend Authentication Dependency
**Problem:** There was uncertainty about connecting the frontend Login page while the backend and database authentication system were still under development.

**Solution:** Separated authentication UI from authentication logic. The frontend was designed to eventually communicate with a FastAPI authentication endpoint, while credential verification and database integration remain backend responsibilities.

**Result:** Frontend authentication development could continue independently without introducing temporary authentication logic that would later need to be discarded.

# Git Branch Workflow Confusion
**Problem:** There was uncertainty about whether frontend work should be pushed directly to the `develop` branch or remain on the individual feature branch.

**Solution:** Established a feature-branch workflow:

`feature/setup-frontend` $\rightarrow$ `develop` $\rightarrow$ `main`

Frontend work was kept on `feature/setup-frontend` and pushed to `origin/feature/setup-frontend`.

**Result:** Frontend development remained isolated from integration work and the work of other team members.

# Git Index Corruption
**Problem:** Git repeatedly reported:

`fatal: .git/index: index file smaller than expected`

Inspection showed that the Git index had become corrupted/empty, preventing normal Git status and repository operations.

**Solution:** The corrupted Git index was rebuilt using Git's index reconstruction process after creating a backup of the existing index.

**Result:** Git status and normal repository operations were restored while preserving the existing repository commits and branches.

**Engineering Lesson:** Git metadata should be handled carefully, especially when automated coding agents are operating on the repository.

# Automated Coding Agent Modifying Git Metadata
**Problem:** Git index corruption appeared again while working with an AI coding agent, creating a risk of repeated damage to repository metadata.

**Solution:** Established explicit safety rules for automated coding agents:
[leftmargin=*]
- Do not modify `.git` files.
- Do not delete or recreate `.git/index`.
- Do not execute destructive Git commands automatically.
- If Git reports index corruption, stop and report the issue.
- Limit automated modifications to the requested frontend source files.
**Result:** Git repository management was separated from automated frontend development, reducing the risk of accidental repository corruption.

# Google AI Studio GitHub Authentication Issue
**Problem:** Google AI Studio initially failed to retrieve the ClassSight repository and displayed authentication errors indicating missing credentials and unavailable repositories.

**Solution:** Switched to the Google account with the appropriate GitHub repository access and verified that Google AI Studio was authorized for the relevant GitHub account.

**Result:** The ClassSight repository became visible to Google AI Studio and could be imported.

# AI Studio Imported the Wrong Branch
**Problem:** Google AI Studio successfully imported the ClassSight repository but displayed the old/default Vite starter frontend instead of the developed ClassSight frontend.

**Root Cause:** The developed frontend existed on `feature/setup-frontend`, while AI Studio imported the repository's default `main` branch.

**Solution:** Identified the branch mismatch instead of rebuilding the frontend. The repository default branch was temporarily changed to `feature/setup-frontend` so AI Studio could import the correct developed frontend state.

**Result:** AI Studio successfully imported the existing ClassSight frontend implementation.

# Temporary GitHub Default Branch Change
**Problem:** The AI Studio GitHub import interface exposed the repository's default branch rather than directly allowing the required feature branch to be selected.

**Solution:** Temporarily changed the ClassSight repository's default branch from `main` to `feature/setup-frontend`.

**Result:** AI Studio imported the correct frontend state. After successful import, the repository default branch was changed back to `main` so the team's normal Git workflow remained unchanged.

**Engineering Lesson:** Repository default-branch changes affect the entire repository and team and should therefore be treated as temporary integration configuration changes.

# Students Page Feature Definition
**Problem:** The Students page required a clearly defined purpose beyond simply displaying a static student list.

**Solution:** Defined a teacher-focused student directory containing:
[leftmargin=*]
- Class-wise student lists
- Attendance percentage to date
- Sorting by student name
- Sorting by roll number
- Sorting by attendance percentage
- Ascending and descending ordering
- Class filtering
- Name and roll-number search
- Attendance status indicators
- Student detail view
- Attendance history
- Total classes, attended, and missed statistics
- Pagination or ``Read More'' functionality for larger datasets
All functionality was specified as frontend/mock behaviour until backend data becomes available.

**Result:** The Students page gained a defined role as a student roster and attendance analysis interface.

# Dashboard Scan Interaction Redesign
**Problem:** The Dashboard Scan button initially performed a scan and stopped immediately, providing no useful interaction for unresolved students.

**Solution:** Redesigned the scan flow to open an interactive frontend modal after scanning. The modal displays currently unverified students and provides the instruction:

*``Tap the library card of the students listed above to resolve their attendance via NFC.''*

Students are dynamically removed or updated from the unresolved list as mock NFC verification occurs.

**Result:** The scan process now represents the intended teacher-in-the-loop attendance verification workflow.

# Frontend-Only NFC Simulation
**Problem:** Actual NFC hardware and API integration were not yet available, but the attendance verification workflow needed to be demonstrated.

**Solution:** Implemented the NFC workflow using React state and mock data rather than real hardware or backend calls.

**Result:** The complete NFC verification interaction can be demonstrated in the frontend while remaining ready for future integration with actual NFC functionality.

# Landing Page Visual Direction Revision
**Problem:** The original landing page was functional but visually plain and contained a large amount of unused whitespace.

**Solution:** Redesigned the landing page concept around a visual architectural composition using:
[leftmargin=*]
- A maroon architectural illustration
- ``SMART CLASSROOM TECHNOLOGY'' eyebrow text
- ``Attendance, simplified.'' hero message
- ClassSight branding
- Sign In action
- Light/dark theme support
- Minimal visual language
The architectural visual was designed to use a slow scroll-parallax interaction rather than continuous decorative animation.

**Result:** The landing page direction became more distinctive and visually aligned with the ClassSight educational-technology identity.

# Landing Page Hero Composition & Whitespace Issue
**Problem:** After introducing the architectural visual, the hero content still appeared too small relative to the viewport, with excessive whitespace surrounding the composition.

**Solution:** The hero layout was iteratively refined toward:
[leftmargin=*]
- A wider two-column hero
- A larger architectural visual
- Larger hero typography
- Reduced excessive padding
- Better viewport utilization
- Balanced visual and content columns
- Slow scroll-parallax on the architecture
- Responsive behaviour for smaller screens
**Result:** The landing page was moved toward a full-viewport editorial/product composition rather than a small content block floating inside a large empty canvas.

# Architectural Asset Whitespace Issue
**Problem:** The architectural reference image itself contained a large amount of white space around the buildings. Increasing the CSS image size therefore did not make the buildings visually large enough.

**Root Cause:** The issue was partly contained within the source image asset rather than being solely a CSS layout problem.

**Solution:** Identified that the asset should be visually cropped or trimmed to remove unnecessary whitespace while preserving the architectural structures and their aspect ratio.

**Result:** The architectural visual can occupy a larger portion of the hero without requiring excessive scaling of the complete source image.
