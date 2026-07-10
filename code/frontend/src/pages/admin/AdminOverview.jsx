import { useState, useEffect } from "react";
import { getAdminStats, getAdminAuditLogs } from "../../utils/api.js";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const statsData = await getAdminStats();
      setStats(statsData);
      
      const logs = await getAdminAuditLogs({ limit: 10 });
      setLiveFeed(logs);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh feed every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading overview dashboard...</div>;
  }

  return (
    <div>
      {error && <div className="admin-badge rejected" style={{ marginBottom: 20, width: "100%", borderRadius: 8 }}>{error}</div>}

      {/* Stats KPI Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "#EFF6FF", color: "#3B82F6" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="8" r="2" fill="#3B82F6"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="admin-stat-label">Total Registered Users</div>
            <div className="admin-stat-value">{stats?.total_users || 0}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7v5l3 1" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12A9 9 0 1 1 12 3" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="admin-stat-label">Pending Approval</div>
            <div className="admin-stat-value" style={{ color: (stats?.pending_users > 0) ? "#D97706" : "inherit" }}>
              {stats?.pending_users || 0}
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="admin-stat-label">Approved Accounts Today</div>
            <div className="admin-stat-value">{stats?.approved_today || 0}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "#FEE2E2", color: "#EF4444" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="16" r="1" fill="#EF4444"/><path d="M10 3h4l1 3H9l1-3z" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <div className="admin-stat-label">Failed Logins (24h)</div>
            <div className="admin-stat-value" style={{ color: (stats?.failed_logins_24h > 2) ? "#EF4444" : "inherit" }}>
              {stats?.failed_logins_24h || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Live Audit Activity Feed */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Live Audit Activity Feed</h2>
          <span className="admin-badge approved" style={{ fontSize: 11 }}>Auto-refresh: 15s</span>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "180px" }}>Timestamp</th>
                <th style={{ width: "200px" }}>User</th>
                <th style={{ width: "160px" }}>Action</th>
                <th style={{ width: "100px" }}>Status</th>
                <th>Summary Description</th>
              </tr>
            </thead>
            <tbody>
              {liveFeed.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "#94A3B8" }}>
                    No recent events logged.
                  </td>
                </tr>
              ) : (
                liveFeed.map(feed => (
                  <tr key={feed.id}>
                    <td style={{ fontSize: "12.5px", color: "#64748B" }}>
                      {new Date(feed.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {feed.user_email || "System"}
                    </td>
                    <td>
                      <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, fontSize: "11px" }}>
                        {feed.action}
                      </code>
                    </td>
                    <td>
                      <span className={`admin-badge ${feed.status === "success" ? "approved" : "rejected"}`}>
                        {feed.status}
                      </span>
                    </td>
                    <td style={{ color: "#475569" }}>{feed.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
