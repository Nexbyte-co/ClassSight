import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Settings,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Radio,
  Clock,
  Calendar,
  Menu,
  X,
  ScanFace,
  UploadCloud,
  Check,
  User,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Square,
  Play,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./Dashboard.css";
import { useTheme } from "../context/ThemeContext";
import { useAttendance } from "../context/AttendanceContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";

function Dashboard() {
  const navigate = useNavigate();

  // Attendance context (Task 2)
  const { unverifiedStudents, verifiedStudents, resolveStudent } = useAttendance();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Navigation drawer state
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Photo scan state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [photoScanSuccess, setPhotoScanSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // NFC scan state (Task 2)
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [resolvingStudentId, setResolvingStudentId] = useState(null);
  const [nfcSuccessAnimation, setNfcSuccessAnimation] = useState(false);

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
      status: "done",
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

  // Dynamic status & active session tracking (Instructions 4 & 5)
  const [manualActiveClassId, setManualActiveClassId] = useState(null);
  const [endedClassIds, setEndedClassIds] = useState(() => new Set());
  const [currentTimeTick, setCurrentTimeTick] = useState(() => new Date());

  // Confirm delete modal state (Instruction 3)
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState(null);

  // Tick timer every 30s to dynamically update time-based status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Time slot parser helper (Instruction 5)
  const parseTimeSlotMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(/[–-]/).map((s) => s.trim());
    const parseSingle = (s) => {
      const match = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const startMinutes = parseSingle(parts[0]);
    const endMinutes =
      parts.length > 1
        ? parseSingle(parts[1])
        : startMinutes !== null
        ? startMinutes + 50
        : null;
    return { startMinutes, endMinutes };
  };

  // Compute status for all classes based on current time and manual actions (Instructions 4 & 5)
  const finalScheduleList = useMemo(() => {
    const currentMinutes =
      currentTimeTick.getHours() * 60 + currentTimeTick.getMinutes();

    const evaluated = scheduleList.map((item) => {
      if (endedClassIds.has(item.id)) {
        return { ...item, computedStatus: "done" };
      }
      if (manualActiveClassId === item.id) {
        return { ...item, computedStatus: "active" };
      }
      if (manualActiveClassId !== null && manualActiveClassId !== item.id) {
        const slot = parseTimeSlotMinutes(item.timeRange || item.time);
        if (slot?.endMinutes && currentMinutes > slot.endMinutes) {
          return { ...item, computedStatus: "done" };
        }
        return { ...item, computedStatus: "upcoming" };
      }

      // Respect scheduled time (Instruction 5)
      const slot = parseTimeSlotMinutes(item.timeRange || item.time);
      if (slot?.startMinutes !== null && slot?.endMinutes !== null) {
        if (currentMinutes >= slot.startMinutes && currentMinutes <= slot.endMinutes) {
          return { ...item, computedStatus: "active" };
        }
        if (currentMinutes > slot.endMinutes) {
          return { ...item, computedStatus: "done" };
        }
        return { ...item, computedStatus: "unstarted", startMinutes: slot.startMinutes };
      }
      return { ...item, computedStatus: item.status || "upcoming" };
    });

    const unstarted = evaluated
      .filter((c) => c.computedStatus === "unstarted")
      .sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));

    const nextId = unstarted.length > 0 ? unstarted[0].id : null;

    return evaluated.map((c) => {
      if (c.computedStatus === "unstarted") {
        if (c.id === nextId) {
          return { ...c, computedStatus: "next" };
        }
        return { ...c, computedStatus: "upcoming" };
      }
      return c;
    });
  }, [scheduleList, manualActiveClassId, endedClassIds, currentTimeTick]);

  // Current active class in session (Instruction 4)
  const currentActiveClass = useMemo(() => {
    const found = finalScheduleList.find((c) => c.computedStatus === "active");
    if (found) return found;
    if (manualActiveClassId) {
      return finalScheduleList.find((c) => c.id === manualActiveClassId) || null;
    }
    return null;
  }, [finalScheduleList, manualActiveClassId]);

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

  // NFC Scan handler & Resolution Flow (Task 2)
  const handleNfcScan = () => {
    setIsNfcModalOpen(true);
  };

  const handleResolveViaNfc = (studentId) => {
    setResolvingStudentId(studentId);
    setTimeout(() => {
      resolveStudent(studentId, "nfc");
      setResolvingStudentId(null);
      // Check if all unverified students are now resolved
      if (unverifiedStudents.length <= 1) {
        setNfcSuccessAnimation(true);
        setTimeout(() => {
          setNfcSuccessAnimation(false);
          setIsNfcModalOpen(false);
        }, 1400);
      }
    }, 400);
  };

  const handleResolveAllNfc = () => {
    if (unverifiedStudents.length === 0) return;
    setResolvingStudentId("all");
    setTimeout(() => {
      unverifiedStudents.forEach((student) => {
        resolveStudent(student.id, "nfc");
      });
      setResolvingStudentId(null);
      setNfcSuccessAnimation(true);
      setTimeout(() => {
        setNfcSuccessAnimation(false);
        setIsNfcModalOpen(false);
      }, 1400);
    }, 600);
  };

  const handleSignOut = () => {
    navigate("/");
  };

  // Active Session Edit Handlers
  const handleOpenSessionEdit = () => {
    if (!currentActiveClass) return;
    setSessionFormData({
      section: currentActiveClass.section || "",
      department: currentActiveClass.department || "Computer Science & Eng.",
      room: currentActiveClass.room || "",
      timeRange: currentActiveClass.timeRange || "",
      title: currentActiveClass.title || "",
      code: currentActiveClass.code || "",
    });
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    if (currentActiveClass) {
      setScheduleList((prev) =>
        prev.map((c) =>
          c.id === currentActiveClass.id ? { ...c, ...sessionFormData } : c
        )
      );
    }
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
      status: item.computedStatus || item.status,
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
    } else {
      // Add new
      const newId = `class-${Date.now()}`;
      const newClass = {
        id: newId,
        ...classFormData,
      };
      setScheduleList((prev) => [...prev, newClass]);
    }
    setIsClassModalOpen(false);
  };

  // Start & End Class Handlers (Instruction 4)
  const handleStartClass = (id) => {
    setManualActiveClassId(id);
    setEndedClassIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleEndClass = (id) => {
    setEndedClassIds((prev) => new Set(prev).add(id));
    if (manualActiveClassId === id) {
      setManualActiveClassId(null);
    }
  };

  // Confirmed Delete Class Handler (Instruction 3)
  const confirmDeleteClass = (id) => {
    setScheduleList((prev) => prev.filter((item) => item.id !== id));
    if (manualActiveClassId === id) {
      setManualActiveClassId(null);
    }
    setEndedClassIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmDeleteClassId(null);
    setIsClassModalOpen(false);
  };

  return (
    <div className={`dashboard-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            {isNavOpen ? <X size={22} /> : <Menu size={22} />}
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
        {/* Navigation Drawer */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage="dashboard"
        />

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

          {/* Current Class Quick Stats Banner (3-Column Strip) (Instruction 4) */}
          {currentActiveClass ? (
            <div className="current-class-strip">
              <div className="strip-header">
                <div className="strip-top-badge">
                  <span className="pulse-dot" />
                  <span>Active Session</span>
                </div>

                <div className="strip-header-actions">
                  <button
                    type="button"
                    className="btn-end-session"
                    onClick={() => handleEndClass(currentActiveClass.id)}
                    title="End current active session"
                  >
                    <Square size={13} fill="currentColor" strokeWidth={0} />
                    <span>End Class</span>
                  </button>

                  <button
                    type="button"
                    className="btn-take-session-attendance"
                    onClick={() =>
                      navigate("/attendance", {
                        state: { classData: currentActiveClass },
                      })
                    }
                    title="Take attendance for this session"
                  >
                    <Camera size={13} strokeWidth={2} />
                    <span>Take Attendance</span>
                  </button>

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
                  <div className="col-value">{currentActiveClass.section}</div>
                  <div className="col-subtext">
                    {currentActiveClass.department || "Computer Science & Eng."}
                  </div>
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
                  <div className="col-value">{currentActiveClass.room}</div>
                  <div className="col-subtext">{currentActiveClass.timeRange}</div>
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
                  <div className="col-value">{currentActiveClass.title}</div>
                  <div className="col-subtext">
                    {currentActiveClass.code} · Prof. Jhonsy
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="current-class-strip no-active-strip">
              <div className="strip-header">
                <div className="strip-top-badge inactive-badge">
                  <span className="dot-muted" />
                  <span>No Active Session</span>
                </div>
              </div>
              <div className="no-active-body">
                <Clock size={20} strokeWidth={1.8} />
                <p>
                  No lecture is currently active. Select a class from <strong>Today&apos;s Classes</strong> below and click <strong>Start Class</strong> to begin live attendance.
                </p>
              </div>
            </div>
          )}

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
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                style={{ display: "none" }}
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

                  {/* Compact Horizontal Result Bar (Instruction 6) */}
                  {photoScanSuccess && (
                    <div className="attendance-result-bar">
                      <div className="result-bar-info">
                        <div className="result-chip present">
                          <span className="result-chip-dot green" />
                          <span className="result-chip-value">{verifiedStudents.length}</span>
                          <span className="result-chip-label">Present</span>
                        </div>
                        <span className="result-bar-divider" />
                        <div className="result-chip absent">
                          <span className="result-chip-dot amber" />
                          <span className="result-chip-value">{unverifiedStudents.length}</span>
                          <span className="result-chip-label">Not Matched / Absent</span>
                        </div>
                        <span className="result-bar-meta">
                          • {currentActiveClass ? `${currentActiveClass.section} ${currentActiveClass.title}` : "3C2 Data Structures"}
                        </span>
                      </div>

                      <div className="result-bar-actions">
                        <button
                          type="button"
                          className="btn-result-view-more"
                          onClick={() =>
                            navigate("/attendance", {
                              state: {
                                classData: currentActiveClass || {
                                  title: "Data Structures",
                                  code: "UCE301",
                                  section: "3C2",
                                  room: "LP402",
                                  timeRange: "08:00 AM – 08:50 AM",
                                },
                              },
                            })
                          }
                        >
                          <span>View More</span>
                          <ArrowRight size={15} strokeWidth={2.2} />
                        </button>
                        <button
                          type="button"
                          className="btn-scan-reset"
                          onClick={handleResetPhoto}
                          title="Upload another photo"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {!photoScanSuccess && isPhotoScanning && (
                    <p style={{ fontSize: 13, color: "var(--cs-crimson)", fontWeight: 600 }}>
                      Scanning faces in {currentActiveClass ? currentActiveClass.section : "3C2"}...
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
                className={`btn-scan-nfc ${isNfcModalOpen ? "scanning" : ""}`}
                onClick={handleNfcScan}
              >
                <Radio size={16} strokeWidth={2} />
                <span>{isNfcModalOpen ? "Live Scanner Open" : "Scan"}</span>
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
              finalScheduleList.map((item) => {
                const isCurrent = currentActiveClass?.id === item.id;
                const status = item.computedStatus;
                return (
                  <div
                    key={item.id}
                    className={`schedule-row ${isCurrent ? "active-row" : ""}`}
                    role="region"
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
                      {status === "active" && (
                        <span className="status-pill active-now">
                          <span className="pulse-dot-green" />
                          <span>Active / In Progress</span>
                        </span>
                      )}
                      {status === "done" && (
                        <span className="status-pill done">
                          <Check size={14} strokeWidth={2.5} />
                          <span>Done</span>
                        </span>
                      )}
                      {status === "next" && (
                        <span className="status-pill next">
                          <span className="dot-white" />
                          <span>Next</span>
                        </span>
                      )}
                      {status === "upcoming" && (
                        <span className="status-pill upcoming">
                          <Clock size={13} strokeWidth={2} />
                          <span>Upcoming</span>
                        </span>
                      )}

                      <div className="class-action-buttons">
                        {status === "active" ? (
                          <>
                            <button
                              type="button"
                              className="btn-row-action-pill btn-take-attendance"
                              onClick={() =>
                                navigate("/attendance", {
                                  state: { classData: item },
                                })
                              }
                            >
                              <Camera size={13} strokeWidth={2} />
                              <span>Take Attendance</span>
                            </button>
                            <button
                              type="button"
                              className="btn-row-action-pill btn-end-class"
                              onClick={() => handleEndClass(item.id)}
                            >
                              <Square size={12} fill="currentColor" strokeWidth={0} />
                              <span>End Class</span>
                            </button>
                          </>
                        ) : status === "done" ? (
                          <button
                            type="button"
                            className="btn-row-action-pill btn-take-attendance-done"
                            onClick={() =>
                              navigate("/attendance", {
                                state: { classData: item },
                              })
                            }
                          >
                            <span>Review Attendance</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-row-action-pill btn-start-class"
                              onClick={() => handleStartClass(item.id)}
                            >
                              <Play size={12} fill="currentColor" strokeWidth={0} />
                              <span>Start Class</span>
                            </button>
                            <button
                              type="button"
                              className="btn-row-action-pill btn-take-attendance"
                              onClick={() =>
                                navigate("/attendance", {
                                  state: { classData: item },
                                })
                              }
                            >
                              <span>Take Attendance</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-row-action"
                          onClick={() => handleOpenEditClass(item)}
                          title="Edit class"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Pencil size={15} strokeWidth={1.8} />
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

              <div className="cs-modal-actions-split">
                {editingClassId && (
                  <button
                    type="button"
                    className="btn-modal-delete"
                    onClick={() => setConfirmDeleteClassId(editingClassId)}
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                    <span>Delete Class</span>
                  </button>
                )}
                <div className="cs-modal-actions-right">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Class (Instruction 3) */}
      {confirmDeleteClassId && (
        <div className="cs-modal-backdrop" onClick={() => setConfirmDeleteClassId(null)}>
          <div className="cs-modal-card cs-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div className="confirm-icon-danger">
                <AlertTriangle size={24} strokeWidth={2} />
              </div>
              <div>
                <h3>Delete Class</h3>
                <p className="cs-modal-subtitle">Are you sure you want to delete this class?</p>
              </div>
            </div>
            <p className="confirm-body-text">
              This class will be permanently removed from today&apos;s schedule list.
            </p>
            <div className="cs-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmDeleteClassId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-delete-confirm"
                onClick={() => confirmDeleteClass(confirmDeleteClassId)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NFC ATTENDANCE RESOLUTION MODAL (Task 2) ================= */}
      {isNfcModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsNfcModalOpen(false)}>
          <div
            className="cs-modal-card nfc-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nfc-modal-title"
          >
            {/* Modal Header */}
            <div className="nfc-modal-header">
              <div className="nfc-header-title-group">
                <div className="nfc-modal-icon-bubble">
                  <Radio size={22} className="nfc-pulse-anim" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="nfc-title-row">
                    <h3 id="nfc-modal-title">NFC Attendance Resolution</h3>
                    <span className="nfc-live-badge">Live Reader Active</span>
                  </div>
                  <p className="cs-modal-subtitle">
                    Section {currentActiveClass ? currentActiveClass.section : "3C2"} • Contactless Card Verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setIsNfcModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {nfcSuccessAnimation ? (
              <div className="nfc-modal-success-state">
                <div className="nfc-success-circle">
                  <CheckCircle2 size={48} strokeWidth={2.4} />
                </div>
                <h4>All Students Verified via NFC!</h4>
                <p>All unverified detections have been resolved and added to verified present attendance records.</p>
              </div>
            ) : unverifiedStudents.length === 0 ? (
              <div className="nfc-modal-empty-state">
                <div className="nfc-success-circle">
                  <CheckCircle2 size={44} strokeWidth={2.2} />
                </div>
                <h4>No Unresolved Students</h4>
                <p>All students in this session have already been verified and confirmed present.</p>
                <div className="nfc-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setIsNfcModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="nfc-count-strip">
                  <div className="nfc-count-pill pending">
                    <AlertCircle size={15} />
                    <span>{unverifiedStudents.length} Unresolved Student{unverifiedStudents.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="nfc-count-pill verified">
                    <Check size={15} />
                    <span>{verifiedStudents.length} Verified Present</span>
                  </div>
                </div>

                {/* List of currently unverified students detected from scan */}
                <div className="nfc-student-list">
                  {unverifiedStudents.map((student) => (
                    <div key={student.id} className="nfc-student-row">
                      <div className="nfc-student-avatar">
                        {student.name.charAt(0)}
                      </div>
                      <div className="nfc-student-info">
                        <div className="nfc-student-name-row">
                          <span className="nfc-student-name">{student.name}</span>
                          <span className="nfc-roll-pill">{student.roll}</span>
                        </div>
                        <span className="nfc-student-reason">
                          {student.reason || "Detection issue • Card verification required"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`btn-nfc-tap ${resolvingStudentId === student.id ? "tapping" : ""}`}
                        onClick={() => handleResolveViaNfc(student.id)}
                        disabled={resolvingStudentId !== null}
                        title={`Tap library card for ${student.name}`}
                      >
                        <Radio size={14} strokeWidth={2.2} />
                        <span>
                          {resolvingStudentId === student.id ? "Reading Card..." : "Tap Library Card"}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* EXACT REQUIRED MESSAGE (Task 2, Requirement 3) */}
                <div className="nfc-instruction-banner">
                  <div className="nfc-banner-icon">
                    <Radio size={18} strokeWidth={2.2} />
                  </div>
                  <p className="nfc-banner-text">
                    Tap the library card of the students listed above to resolve their attendance via NFC.
                  </p>
                </div>

                {/* Modal Footer with Actions & Close Button (Task 2, Requirement 8) */}
                <div className="nfc-modal-footer">
                  <button
                    type="button"
                    className="btn-nfc-resolve-all"
                    onClick={handleResolveAllNfc}
                    disabled={resolvingStudentId !== null}
                  >
                    {resolvingStudentId === "all" ? "Reading All Cards..." : `Simulate Tap for All (${unverifiedStudents.length})`}
                  </button>
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setIsNfcModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;