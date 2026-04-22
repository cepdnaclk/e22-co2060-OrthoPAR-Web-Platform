import { useState } from "react";
import Dashboard from './pages/DashboardPage';
import AnalysisStudio from './pages/AnalysisPage';
import PatientsPage from './pages/PatientsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { C, STATUS_COLORS } from "./utils/constants.js";
import { Icons } from "./utils/components.jsx";
import { styles } from "./utils/styles.js";

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [activeNav, setActiveNav] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.home },
    { id: "studio", label: "Analysis Studio", icon: Icons.scan },
    { id: "patients", label: "Patients", icon: Icons.patients },
    { id: "reports", label: "Reports", icon: Icons.reports },
  ];

  const handleAnalyze = () => {
    setScreen("studio");
    setActiveNav("studio");
  };

  const titles = {
    dashboard: { title: "Dashboard", sub: "Welcome back, Dr. Chen · Feb 17, 2025" },
    studio: { title: "Analysis Studio", sub: "Interactive PAR Index Calculator · PT-2041" },
    patients: { title: "Patients", sub: "All patient records" },
    reports: { title: "Reports", sub: "Saved analysis reports" },
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
              <button className="nav-item" style={{ marginBottom: 0 }} onClick={() => { setActiveNav("settings"); setScreen("settings"); }}>
                {Icons.settings}
                Settings
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="avatar">DC</div>
            <div>
              <div className="avatar-name">Dr. Chen</div>
              <div className="avatar-role">Orthodontist</div>
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
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>DC</div>
            </div>
          </header>

          {screen === "dashboard" && (
            <div className="content fade-in">
              <Dashboard onAnalyze={handleAnalyze} />
            </div>
          )}

          {screen === "studio" && (
            <div style={{ flex: 1, overflow: "hidden" }} className="fade-in">
              <AnalysisStudio />
            </div>
          )}

          {screen === "patients" && (
            <PatientsPage />
          )}

          {screen === "reports" && (
            <ReportsPage />
          )}

          {screen === "settings" && (
            <SettingsPage />
          )}
        </div>
      </div>
    </>
  );
}