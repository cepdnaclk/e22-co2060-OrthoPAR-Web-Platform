import { useState } from "react";
import Dashboard from './pages/DashboardPage';
import AnalysisStudio from './pages/AnalysisPage';
import PatientsPage from './pages/PatientsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext.jsx';
import { C, STATUS_COLORS } from "./utils/constants.js";
import { Icons } from "./utils/components.jsx";
import { styles } from "./utils/styles.js";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [screen, setScreen] = useState("dashboard");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activePatientId, setActivePatientId] = useState(null);

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

  // Derive initials and display name from real user
  const initials = user.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();
  const displayName = user.full_name || user.email;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.home },
    { id: "studio", label: "Analysis Studio", icon: Icons.scan },
    { id: "patients", label: "Patients", icon: Icons.patients },
    { id: "reports", label: "Reports", icon: Icons.reports },
  ];

  const handleAnalyze = (patientId) => {
    setActivePatientId(patientId);
    setScreen("studio");
    setActiveNav("studio");
  };

  const titles = {
    dashboard: { title: "Dashboard", sub: `Welcome back, ${displayName}` },
    studio: { title: "Analysis Studio", sub: "Interactive PAR Index Calculator" },
    patients: { title: "Patients", sub: "All patient records" },
    reports: { title: "Reports", sub: "Saved analysis reports" },
    settings: { title: "Settings", sub: "Account & preferences" },
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

          <div style={{ marginTop: "auto" }}>
            <div className="nav-section" style={{ marginBottom: 0 }}>
              <button className="nav-item" style={{ marginBottom: 4 }} onClick={() => { setActiveNav("settings"); setScreen("settings"); }}>
                {Icons.settings}
                Settings
              </button>
              <button
                className="nav-item"
                style={{ marginBottom: 0, color: C.red }}
                onClick={logout}
                id="logout-btn"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="avatar">{initials}</div>
            <div>
              <div className="avatar-name">{displayName}</div>
              <div className="avatar-role">{user.email}</div>
            </div>
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
              <AnalysisStudio patientId={activePatientId} />
            </div>
          )}

          {screen === "patients" && <PatientsPage />}
          {screen === "reports" && <ReportsPage />}
          {screen === "settings" && <SettingsPage />}
        </div>
      </div>
    </>
  );
}