import { useState, Component } from "react";
import Dashboard from './pages/DashboardPage';
import AnalysisStudio from './pages/AnalysisPage';
import PatientsPage from './pages/PatientsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import CompleteProfile from './pages/CompleteProfile';
import AuditTrailPage from './pages/AuditTrailPage';
import AdminApp from './pages/admin/AdminApp';
import { useAuth } from './context/AuthContext.jsx';
import { C, STATUS_COLORS } from "./utils/constants.js";
import { Icons } from "./utils/components.jsx";
import { styles } from "./utils/styles.js";

// Error boundary catches JS crashes in AnalysisStudio / ThreeViewer
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, message: "" }; }
  static getDerivedStateFromError(err) { return { hasError: true, message: err?.message || "Unknown error" }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 40 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#EF4444" }}>Rendering Error</div>
          <div style={{ fontSize: 13, color: "#64748B", maxWidth: 400, textAlign: "center" }}>{this.state.message}</div>
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "1px solid #CBD5E1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [screen, setScreen] = useState("dashboard");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activePatientId, setActivePatientId] = useState(null);
  const [reportPatientId, setReportPatientId] = useState(null);
  const [reportViewMode, setReportViewMode] = useState("trend");

  // While checking stored token, show nothing (avoid flash)
  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap'); body { font-family: 'DM Sans', sans-serif; background: #F4F7FB; }`}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: C.textMuted, fontSize: 14 }}>
          Loading…
        </div>
      </>
    );
  }

  // Not authenticated — show auth page
  if (!user) return <AuthPage />;

  // Admin routing check — admins get their own full app
  if (user.role === "admin") {
    return <AdminApp />;
  }

  // Google OAuth users must complete their profile before proceeding
  const needsProfileCompletion = user.auth_provider === 'google' && (!user.hospital_name || !user.slmc_registration_number);
  if (needsProfileCompletion && screen !== 'settings') {
    return <CompleteProfile onComplete={() => setScreen("dashboard")} />;
  }

  // Clinician workflow status check (block pending/rejected users from getting inside)
  if (user.account_status !== "approved") {
    const initials = user.full_name
      ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
      : user.email.slice(0, 2).toUpperCase();
    const displayName = user.full_name || user.email;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", padding: 24, textAlign: "center",
        background: "#F4F7FB", fontFamily: "DM Sans, sans-serif"
      }}>
        <div style={{ fontSize: 54, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0", fontSize: 22, letterSpacing: "-0.5px" }}>
          Registration Review in Progress
        </h2>
        <p style={{ color: "#475569", maxWidth: 460, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 24px 0" }}>
          Thank you for registering, <strong>{displayName}</strong>. Your clinician profile is currently in our verification queue.
          Clinical workspaces and calculation features will be enabled as soon as your SLMC credentials are verified by an administrator.
        </p>
        <button
          onClick={logout}
          style={{
            padding: "10px 24px", borderRadius: 8, background: "#EF4444",
            color: "#FFFFFF", border: "none", cursor: "pointer", fontWeight: 600,
            fontSize: 13, boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)"
          }}
        >
          Sign Out & Return
        </button>
      </div>
    );
  }

  // Derive initials and display name from real user
  const initials = user.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();
  const displayName = user.full_name || user.email;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.home },
    { id: "studio", label: "Analysis Studio", icon: Icons.scan },
    { id: "patients", label: "Patients", icon: Icons.patients },
    { id: "audit", label: "Audit Trail", icon: Icons.reports },
  ];

  if (user.is_admin) {
    navItems.push({ id: "admin", label: "Model Admin", icon: Icons.settings }); // Using settings icon for now as a fallback
  }

  const handleAnalyze = (patientId) => {
    setActivePatientId(patientId);
    setScreen("studio");
    setActiveNav("studio");
  };

  const handleViewReport = (patientId, mode = "trend") => {
    setReportPatientId(patientId);
    setReportViewMode(mode);
    setScreen("reports");
    setActiveNav("reports");
  };

  const titles = {
    dashboard: { title: "Dashboard", sub: `Welcome back, ${displayName}` },
    studio: { title: "Analysis Studio", sub: "Interactive PAR Index Calculator" },
    patients: { title: "Patients", sub: "All patient records" },
    reports: { title: "Patient Report", sub: reportPatientId ? "Trend analysis & visit history" : "Select a patient to view their report" },
    settings: { title: "Settings", sub: "Account & preferences" },
    audit: { title: "Audit Trail", sub: "Secure append-only clinicians activity logs" },
    admin: { title: "Model Management", sub: "Manage PAR index ML models" },
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">{Icons.tooth}</div>
            <div>
              <div className="logo-text">OrthoScan</div>
              <div className="logo-sub">PAR Index</div>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-label">Navigation</div>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item${activeNav === item.id ? " active" : ""}`}
                onClick={() => { setActiveNav(item.id); setScreen(item.id); }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "auto", padding: "0 12px" }}>
            <button className={`nav-item${activeNav === "settings" ? " active" : ""}`} style={{ marginBottom: 0 }} onClick={() => { setActiveNav("settings"); setScreen("settings"); }}>
              {Icons.settings}
              Settings
            </button>
          </div>

          <div className="sidebar-footer" style={{ flexDirection: "column", alignItems: "stretch", gap: 12, padding: "16px 12px", marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
              <div className="avatar">{initials}</div>
              <div>
                <div className="avatar-name">{displayName}</div>
                <div className="avatar-role">{user.email}</div>
              </div>
            </div>
            
            <button
              className="nav-item"
              style={{ margin: 0, color: C.red, opacity: 0.8 }}
              onClick={logout}
              id="logout-btn"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main">
          <header className="topbar">
            <div>
              <div className="topbar-title">{titles[screen]?.title}</div>
              <div className="topbar-sub">{titles[screen]?.sub}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="search-wrap">
                <span className="search-icon">{Icons.search}</span>
                <input className="search-input" placeholder="Search Patient ID…" />
              </div>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initials}</div>
            </div>
          </header>

          {screen === "dashboard" && (
            <div className="content fade-in">
              <Dashboard onAnalyze={handleAnalyze} />
            </div>
          )}

          {screen === "studio" && (
            <div style={{ flex: 1, overflow: "hidden" }} className="fade-in">
              <ErrorBoundary key={activePatientId}>
                <AnalysisStudio patientId={activePatientId} />
              </ErrorBoundary>
            </div>
          )}

          {screen === "patients" && <PatientsPage onAnalyze={handleAnalyze} onViewReport={handleViewReport} />}
           {screen === "reports" && (
            <ReportsPage
              patientId={reportPatientId}
              viewMode={reportViewMode}
              onBack={() => { setScreen("patients"); setActiveNav("patients"); }}
            />
          )}
          {screen === "settings" && <SettingsPage />}
          {screen === "audit" && (
            <div className="fade-in" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <AuditTrailPage />
            </div>
          )}
          {screen === "admin" && user.is_admin && <AdminPage />}
        </div>
      </div>
    </>
  );
}