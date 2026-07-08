import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import AdminOverview from "./AdminOverview";
import PendingApprovals from "./PendingApprovals";
import UserManagement from "./UserManagement";
import AdminAuditTrail from "./AdminAuditTrail";
import SecurityMonitor from "./SecurityMonitor";
import "./admin.css";

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const initials = user.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  const menuItems = [
    { id: "overview", label: "Overview Dashboard", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="4" height="8" rx="1" fill="#64748B"/><rect x="9" y="9" width="4" height="6" rx="1" fill="#64748B"/><rect x="15" y="5" width="4" height="10" rx="1" fill="#64748B"/></svg>
    ) },
    { id: "pending", label: "Pending Approvals", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6l4 2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#64748B" strokeWidth="1.5"/></svg>
    ) },
    { id: "users", label: "User Directory", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.657 0 3 1.343 3 3v2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 11c-1.657 0-3 1.343-3 3v2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="3" stroke="#64748B" strokeWidth="1.5"/></svg>
    ) },
    { id: "audit", label: "Complete Audit Trail", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12h6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 16h6" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="18" rx="2" stroke="#64748B" strokeWidth="1.5"/></svg>
    ) },
    { id: "security", label: "Security & Monitoring", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l7 4v5c0 5-3.582 9.74-7 11-3.418-1.26-7-6-7-11V6l7-4z" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ) },
  ];

  const pageHeaders = {
    overview: { title: "Admin Overview", sub: "Live activity dashboard & KPI monitor" },
    pending: { title: "Approval Queue", sub: "Verify clinician registrations and grant access" },
    users: { title: "User Base Directory", sub: "View active profiles, lock accounts, or update authorization roles" },
    audit: { title: "System Audit Logs", sub: "Filter and inspect immutable user activity records" },
    security: { title: "Security Operations", sub: "Monitor failed log-in clusters and trace threat vectors" },
  };

  return (
    <div className="admin-layout">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c2 0 3 1 4 2s1 3 1 4-1 3-2 4-2 2-3 2-2-1-3-2-2-2-3-4-1-3 1-4 2-2 4-2z" fill="#0077B6"/></svg>
            <div>OrthoScan Admin</div>
          </div>
          <div className="admin-sidebar-sub">Management Suite</div>
        </div>

        <nav className="admin-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "#4F46E5",
              display: "flex", alignItems: "center", justifyContext: "center",
              fontSize: 12, fontWeight: 700, color: "#FFFFFF", justifyContent: "center"
            }}>
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 600, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.full_name}
              </span>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>System Admin</span>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              background: "transparent", border: "none", color: "#EF4444",
              fontSize: 16, cursor: "pointer", opacity: 0.8
            }}
            title="Log Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12H3" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </aside>

      {/* Main workspace panels */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>{pageHeaders[activeTab].title}</h1>
            <p>{pageHeaders[activeTab].sub}</p>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "pending" && <PendingApprovals />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "audit" && <AdminAuditTrail />}
          {activeTab === "security" && <SecurityMonitor />}
        </div>
      </main>
    </div>
  );
}
