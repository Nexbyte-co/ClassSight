import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  GraduationCap,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Radio,
  CheckCircle2,
  Clock,
  Calendar,
  Menu,
  X,
  ScanFace,
  UploadCloud,
  Check,
  User,
  ShieldCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import "./Dashboard.css";
import { useTheme } from "../context/ThemeContext";

function Dashboard() {
  const navigate = useNavigate();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Mobile sidebar toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Photo scan state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [photoScanSuccess, setPhotoScanSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // NFC scan state
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcToast, setNfcToast] = useState(null);

  // Schedule list (Teacher can customize, add, edit, and delete)
  const [scheduleList, setScheduleList] = useState([
    {
      id: "class-1",
      time: "08:00 AM",
      timeRange: "08:00 AM – 08:50 AM",
      title: "Data Structures",
      code: "UCE301",
      section: "3C2",
      room: "LP402",
      department: "Computer Science & Eng.",
      status: "done", // 'done', 'next', 'upcoming'
    },
    {
      id: "class-2",
      time: "10:00 AM",
      timeRange: "10:00 AM – 10:50 AM",
      title: "Operating Systems",
      code: "UCE304",
      section: "3C1",
      room: "LT101",
      department: "Computer Science & Eng.",
      status: "next",
    },
    {
      id: "class-3",
      time: "02:00 PM",
      timeRange: "02:00 PM – 02:50 PM",
      title: "Database Management",
      code: "UCE305",
      section: "3C2",
      room: "LP402",
      department: "Computer Science & Eng.",
      status: "upcoming",
    },
  ]);

  // Active Session state (Batch, Venue, Course, Time)
  const [activeClass, setActiveClass] = useState({
    id: "class-1",
    time: "08:00 AM",
    timeRange: "08:00 AM – 08:50 AM",
    title: "Data Structures",
    code: "UCE301",
    section: "3C2",
    room: "LP402",
    department: "Computer Science & Eng.",
    status: "done",
  });

  // Modal: Edit Active Session
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    section: "",
    department: "",
    room: "",
    timeRange: "",
    title: "",
    code: "",
  });

  // Modal: Add / Edit Class in Today's Classes
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classFormData, setClassFormData] = useState({
    title: "",
    code: "",
    section: "",
    room: "",
    time: "",
    timeRange: "",
    department: "Computer Science & Eng.",
    status: "upcoming",
  });

  // Notifications
  const notifications = [
    {
      id: 1,
      title: "Attendance Processed",
      text: "3C2 Data Structures attendance recorded (48/52 present).",
      time: "10m ago",
    },
    {
      id: 2,
      title: "Smart Camera Ready",
      text: "LP402 high-resolution angle calibrated for facial detection.",
      time: "1h ago",
    },
    {
      id: 3,
      title: "Upcoming Lecture",
      text: "Operating Systems in LT101 starts at 10:00 AM.",
      time: "2h ago",
    },
  ];

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Professor 👋";
    if (hour < 17) return "Good afternoon, Professor 👋";
    return "Good evening, Professor 👋";
  };

  const currentDateString = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Photo upload handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setSelectedPhoto(photoUrl);
      setIsPhotoScanning(true);
      setPhotoScanSuccess(false);

      // Simulate AI Face detection
      setTimeout(() => {
        setIsPhotoScanning(false);
        setPhotoScanSuccess(true);
      }, 1600);
    }
  };

  const handleResetPhoto = () => {
    setSelectedPhoto(null);
    setPhotoScanSuccess(false);
    setIsPhotoScanning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // NFC Scan handler
  const handleNfcScan = () => {
    setIsNfcScanning(true);
    setTimeout(() => {
      setIsNfcScanning(false);
      setNfcToast({
        name: "Aarav Sharma",
        roll: "3C2-042",
        status: "Verified & Present",
      });
      setTimeout(() => {
        setNfcToast(null);
      }, 4000);
    }, 1200);
  };

  const handleSignOut = () => {
    navigate("/login");
  };

  // Active Session Edit Handlers
  const handleOpenSessionEdit = () => {
    setSessionFormData({
      section: activeClass.section || "",
      department: activeClass.department || "Computer Science & Eng.",
      room: activeClass.room || "",
      timeRange: activeClass.timeRange || "",
      title: activeClass.title || "",
      code: activeClass.code || "",
    });
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    const updated = {
      ...activeClass,
      ...sessionFormData,
    };
    setActiveClass(updated);

    // Keep corresponding class in Today's Classes in sync if matched
    setScheduleList((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...sessionFormData } : c))
    );

    setIsSessionModalOpen(false);
  };

  // Scheduled Class (Add/Edit) Handlers
  const handleOpenAddClass = () => {
    setEditingClassId(null);
    setClassFormData({
      title: "",
      code: "",
      section: "",
      room: "",
      time: "",
      timeRange: "",
      department: "Computer Science & Eng.",
      status: "upcoming",
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (item) => {
    setEditingClassId(item.id);
    setClassFormData({
      title: item.title,
      code: item.code,
      section: item.section,
      room: item.room,
      time: item.time,
      timeRange: item.timeRange,
      department: item.department || "Computer Science & Eng.",
      status: item.status,
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e) => {
    e.preventDefault();
    if (editingClassId) {
      // Edit existing
      setScheduleList((prev) =>
        prev.map((item) =>
          item.id === editingClassId ? { ...item, ...classFormData } : item
        )
      );

      // If active class is the edited one, update it as well
      if (activeClass.id === editingClassId) {
        setActiveClass((prev) => ({
          ...prev,
          ...classFormData,
        }));
      }
    } else {
      // Add new
      const newId = `class-${Date.now()}`;
      const newClass = {
        id: newId,
        ...classFormData,
      };
      setScheduleList((prev) => [...prev, newClass]);

      // If no active class yet, activate this one
      if (!activeClass || scheduleList.length === 0) {
        setActiveClass(newClass);
      }
    }
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (id) => {
    setScheduleList((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeClass.id === id) {
        if (filtered.length > 0) {
          setActiveClass(filtered[0]);
        }
      }
      return filtered;
    });
  };

  return (
    <div className={`dashboard-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
        </div>

        <div className="header-right">
          {/* Dark / Light Mode Toggle */}
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              className="header-icon-btn"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              aria-label="Notifications"
            >
              <Bell size={19} strokeWidth={1.8} />
              <span className="notification-badge" />
            </button>

            {isNotificationsOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-user-name">Notifications</div>
                  <div className="dropdown-user-email">Classroom attendance alerts</div>
                </div>
                {notifications.map((n) => (
                  <div key={n.id} className="dropdown-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 600, color: "var(--cs-text-primary)", fontSize: 13 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cs-text-secondary)", marginTop: 2 }}>
                      {n.text}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--cs-text-muted)", marginTop: 4 }}>
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="user-profile-wrapper">
            <button
              className="profile-trigger"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              aria-label="User menu"
            >
              <div className="profile-avatar">PJ</div>
              <span className="profile-name">Professor Jhonsy</span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`profile-chevron ${isProfileOpen ? "open" : ""}`}
              />
            </button>

            {isProfileOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-user-name">Professor Jhonsy</div>
                  <div className="dropdown-user-email">Jhonsy.Bansal@thapar.edu</div>
                </div>

                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User size={16} strokeWidth={1.8} />
                  <span>Profile Overview</span>
                </Link>

                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings size={16} strokeWidth={1.8} />
                  <span>Account Settings</span>
                </Link>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleSignOut}
                  style={{ color: "#dc2626" }}
                >
                  <LogOut size={16} strokeWidth={1.8} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN SHELL ================= */}
      <div className="dashboard-body">
        {/* ================= SIDEBAR ================= */}
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <nav className="sidebar-nav">
            <Link
              to="/dashboard"
              className="nav-link active"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard size={19} strokeWidth={2} />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/attendance"
              className="nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Camera size={19} strokeWidth={1.8} />
              <span>Attendance</span>
            </Link>

            <Link
              to="/students"
              className="nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <GraduationCap size={19} strokeWidth={1.8} />
              <span>Students</span>
            </Link>

            <Link
              to="/reports"
              className="nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <BarChart3 size={19} strokeWidth={1.8} />
              <span>Reports</span>
            </Link>

            <Link
              to="/settings"
              className="nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Settings size={19} strokeWidth={1.8} />
              <span>Settings</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <div className="term-info-badge">
              <strong>Spring Term 2026</strong>
              <span>CSE Dept. · Semester 6</span>
            </div>

            <button
              type="button"
              className="sidebar-logout"
              onClick={handleSignOut}
            >
              <LogOut size={17} strokeWidth={1.8} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <main className="dashboard-main">
          {/* Greeting */}
          <div className="greeting-section">
            <div className="greeting-text">
              <h1>{getGreeting()}</h1>
              <p>Ready to verify today&apos;s lectures and attendance.</p>
            </div>

            <div className="greeting-date">
              <Calendar size={15} strokeWidth={1.8} />
              <span>{currentDateString}</span>
            </div>
          </div>

          {/* Current Class Quick Stats Banner (3-Column Strip) */}
          <div className="current-class-strip">
            <div className="strip-header">
              <div className="strip-top-badge">
                <span className="pulse-dot" />
                <span>Active Session</span>
              </div>

              <button
                type="button"
                className="btn-edit-session"
                onClick={handleOpenSessionEdit}
                title="Edit batch, venue, time, or course"
              >
                <Pencil size={13} strokeWidth={2} />
                <span>Edit Session</span>
              </button>
            </div>

            <div className="strip-columns">
              <div
                className="strip-col editable-col"
                role="button"
                tabIndex={0}
                onClick={handleOpenSessionEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOpenSessionEdit();
                }}
                title="Click to edit Batch / Section"
              >
                <div className="col-label">Batch / Section</div>
                <div className="col-value">{activeClass.section}</div>
                <div className="col-subtext">{activeClass.department || "Computer Science & Eng."}</div>
              </div>

              <div className="strip-divider" />

              <div
                className="strip-col editable-col"
                role="button"
                tabIndex={0}
                onClick={handleOpenSessionEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOpenSessionEdit();
                }}
                title="Click to edit Venue & Time"
              >
                <div className="col-label">Venue &amp; Time</div>
                <div className="col-value">{activeClass.room}</div>
                <div className="col-subtext">{activeClass.timeRange}</div>
              </div>

              <div className="strip-divider" />

              <div
                className="strip-col editable-col"
                role="button"
                tabIndex={0}
                onClick={handleOpenSessionEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOpenSessionEdit();
                }}
                title="Click to edit Course / Subject"
              >
                <div className="col-label">Course / Subject</div>
                <div className="col-value">{activeClass.title}</div>
                <div className="col-subtext">{activeClass.code} · Prof. Jhonsy</div>
              </div>
            </div>
          </div>

          {/* Mark Attendance Section */}
          <div className="section-header">
            <h2 className="section-title">Mark Attendance</h2>
            <p className="section-subtitle">
              Choose an AI facial recognition scan or NFC reader to record student check-ins.
            </p>
          </div>

          <div className="attendance-cards-grid">
            {/* PHOTO SCAN CARD */}
            <div className="photo-scan-card">
              <div className="photo-scan-icon-bubble">
                <Camera size={32} strokeWidth={1.8} />
              </div>

              <h3>Photo Scan</h3>
              <p>
                Upload classroom group photo to automatically detect and verify present students
                using AI biometric recognition.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="file-input-hidden"
                onChange={handlePhotoSelect}
              />

              {!selectedPhoto ? (
                <button
                  type="button"
                  className="btn-upload-photo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={18} strokeWidth={2} />
                  <span>Upload Classroom Photo</span>
                </button>
              ) : (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="photo-preview-container">
                    <img
                      src={selectedPhoto}
                      alt="Classroom Scan Preview"
                      className="photo-preview-img"
                    />
                    {isPhotoScanning && <div className="scanning-laser" />}
                  </div>

                  {photoScanSuccess && (
                    <div className="photo-scan-success-bar">
                      <div className="photo-scan-success-info">
                        <CheckCircle2 size={20} strokeWidth={2} />
                        <span>48 Students Identified &amp; Attendance Marked</span>
                      </div>
                      <button
                        type="button"
                        className="btn-scan-reset"
                        onClick={handleResetPhoto}
                      >
                        Upload Another
                      </button>
                    </div>
                  )}

                  {!photoScanSuccess && isPhotoScanning && (
                    <p style={{ fontSize: 13, color: "var(--cs-crimson)", fontWeight: 600 }}>
                      Scanning faces in {activeClass.section}...
                    </p>
                  )}
                </div>
              )}

              <span className="upload-meta-tip">
                Supports JPG, PNG up to 20MB • High resolution classroom panoramic recommended
              </span>
            </div>

            {/* NFC SCAN CARD */}
            <div className="nfc-scan-card">
              <div className="nfc-left">
                <div className="nfc-icon-bubble">
                  <Radio size={24} strokeWidth={2} />
                </div>
                <div className="nfc-info">
                  <h4>NFC Scan</h4>
                  <p>Manually verify a student using student ID smart card or contactless tag</p>
                </div>
              </div>

              <button
                type="button"
                className={`btn-scan-nfc ${isNfcScanning ? "scanning" : ""}`}
                onClick={handleNfcScan}
              >
                <Radio size={16} strokeWidth={2} />
                <span>{isNfcScanning ? "Detecting NFC Card..." : "Scan"}</span>
              </button>
            </div>
          </div>

          {/* Today's Classes Section (Editable) */}
          <div className="section-header section-header-with-action">
            <div>
              <h2 className="section-title">Today&apos;s Classes</h2>
              <p className="section-subtitle">
                Select a class to activate it, or edit and customize your lectures.
              </p>
            </div>

            <button
              type="button"
              className="btn-add-class"
              onClick={handleOpenAddClass}
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>Add Lecture</span>
            </button>
          </div>

          <div className="schedule-card">
            {scheduleList.length === 0 ? (
              <div className="schedule-empty">
                <p>No classes scheduled for today.</p>
                <button
                  type="button"
                  className="btn-add-class"
                  onClick={handleOpenAddClass}
                  style={{ marginTop: 12 }}
                >
                  <Plus size={16} strokeWidth={2.2} />
                  <span>Add First Lecture</span>
                </button>
              </div>
            ) : (
              scheduleList.map((item) => {
                const isCurrent = activeClass.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`schedule-row ${isCurrent ? "active-row" : ""}`}
                    onClick={() => setActiveClass(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveClass(item);
                    }}
                  >
                    <div className="row-left">
                      <div className="class-time">{item.time}</div>
                      <div className="class-details">
                        <h4>{item.title}</h4>
                        <div className="class-meta">
                          <span>{item.section}</span>
                          <span className="meta-dot">•</span>
                          <span>{item.room}</span>
                          {item.code && (
                            <>
                              <span className="meta-dot">•</span>
                              <span>{item.code}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row-right">
                      {item.status === "done" && (
                        <span className="status-pill done">
                          <Check size={14} strokeWidth={2.5} />
                          <span>Done</span>
                        </span>
                      )}
                      {item.status === "next" && (
                        <span className="status-pill next">
                          <span className="dot-white" />
                          <span>Next</span>
                        </span>
                      )}
                      {item.status === "upcoming" && (
                        <span className="status-pill upcoming">
                          <Clock size={13} strokeWidth={2} />
                          <span>Upcoming</span>
                        </span>
                      )}

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-row-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClass(item);
                          }}
                          title="Edit class"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil size={15} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          className="btn-row-action btn-row-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(item.id);
                          }}
                          title="Delete class"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* ================= MODAL: EDIT ACTIVE SESSION ================= */}
      {isSessionModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsSessionModalOpen(false)}>
          <div className="cs-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>Edit Active Session</h3>
                <p>Customize batch, venue, time, and course for the current lecture.</p>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setIsSessionModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="cs-modal-form">
              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-batch">Batch / Section</label>
                  <input
                    id="session-batch"
                    type="text"
                    required
                    placeholder="e.g. 3C2"
                    value={sessionFormData.section}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, section: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-dept">Department / Subtext</label>
                  <input
                    id="session-dept"
                    type="text"
                    placeholder="e.g. Computer Science & Eng."
                    value={sessionFormData.department}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, department: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-room">Venue / Room</label>
                  <input
                    id="session-room"
                    type="text"
                    required
                    placeholder="e.g. LP402"
                    value={sessionFormData.room}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, room: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-time">Time Range</label>
                  <input
                    id="session-time"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM – 08:50 AM"
                    value={sessionFormData.timeRange}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, timeRange: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-title">Course / Subject</label>
                  <input
                    id="session-title"
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={sessionFormData.title}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, title: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-code">Course Code</label>
                  <input
                    id="session-code"
                    type="text"
                    required
                    placeholder="e.g. UCE301"
                    value={sessionFormData.code}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CLASS ================= */}
      {isClassModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsClassModalOpen(false)}>
          <div className="cs-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>{editingClassId ? "Edit Scheduled Lecture" : "Add Lecture to Today's Schedule"}</h3>
                <p>Fill in the course, timing, and classroom details.</p>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setIsClassModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="cs-modal-form">
              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-title">Course / Subject Title</label>
                  <input
                    id="class-title"
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={classFormData.title}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, title: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-code">Course Code</label>
                  <input
                    id="class-code"
                    type="text"
                    required
                    placeholder="e.g. UCE301"
                    value={classFormData.code}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-section">Batch / Section</label>
                  <input
                    id="class-section"
                    type="text"
                    required
                    placeholder="e.g. 3C2"
                    value={classFormData.section}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, section: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-room">Venue / Room</label>
                  <input
                    id="class-room"
                    type="text"
                    required
                    placeholder="e.g. LP402"
                    value={classFormData.room}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, room: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-time">Start Time</label>
                  <input
                    id="class-time"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM"
                    value={classFormData.time}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, time: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-timeRange">Full Time Slot</label>
                  <input
                    id="class-timeRange"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM – 08:50 AM"
                    value={classFormData.timeRange}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, timeRange: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="cs-form-group">
                <label htmlFor="class-status">Lecture Status</label>
                <select
                  id="class-status"
                  value={classFormData.status}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, status: e.target.value })
                  }
                >
                  <option value="done">Done (Completed)</option>
                  <option value="next">Next (Active / In Progress)</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsClassModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  {editingClassId ? "Save Changes" : "Add to Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated NFC Detection Toast */}
      {nfcToast && (
        <div className="nfc-toast">
          <div className="toast-icon">
            <ShieldCheck size={20} strokeWidth={2} />
          </div>
          <div className="toast-text">
            <h5>{nfcToast.name} ({nfcToast.roll})</h5>
            <p>{nfcToast.status} in {activeClass.section}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;