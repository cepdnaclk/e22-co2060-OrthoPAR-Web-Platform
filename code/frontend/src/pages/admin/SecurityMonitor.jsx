import { useState, useEffect } from "react";
import { getSecurityEvents, getRecentSecurityAlerts } from "../../utils/api.js";

export default function SecurityMonitor() {
  const [aggregates, setAggregates] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const agg = await getSecurityEvents();
      setAggregates(agg);
      
      const recent = await getRecentSecurityAlerts();
      setAlerts(recent);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load security logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading security monitor logs...</div>;
  }

  // Count alerts or potential threats
  const threatCount = aggregates.filter(a => a.failure_count >= 3).length;

  return (
    <div>
      {error && <div className="admin-badge rejected" style={{ marginBottom: 20, width: "100%", borderRadius: 8 }}>{error}</div>}

      {/* Security Summary Alert Banner */}
      {threatCount > 0 ? (
        <div style={{
          background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12,
          padding: 20, marginBottom: 24, display: "flex", gap: 16, alignItems: "center"
        }}>
          <span style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="16" r="1.2" fill="#991B1B"/><path d="M10 3h4l1 3H9l1-3z" stroke="#991B1B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <div>
            <h3 style={{ margin: 0, color: "#991B1B", fontWeight: 700, fontSize: 16 }}>
              Suspicious Authentication Activity Warning
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#7F1D1D", fontSize: 13.5 }}>
              There are <strong>{threatCount}</strong> distinct IPs or accounts with repeated failed authentication attempts (3 or more) in the past 24 hours. Review the tables below.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12,
          padding: 16, marginBottom: 24, display: "flex", gap: 12, alignItems: "center"
        }}>
          <span style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l7 4v5c0 5-3.582 9.74-7 11-3.418-1.26-7-6-7-11V6l7-4z" stroke="#065F46" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span style={{ color: "#065F46", fontWeight: 600, fontSize: 14 }}>
            System Integrity Status: Secure. No abnormal login bursts or brute force traces detected.
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        
        {/* Aggregated Login Failures */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Aggregated Failures (Last 24 Hours)</h2>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Target Email Address</th>
                  <th>Client IP</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Failures</th>
                  <th>Last Effort</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: 30, color: "#64748B" }}>
                      No authentication failures logged in the last 24h.
                    </td>
                  </tr>
                ) : (
                  aggregates.map((item, index) => {
                    const isThreat = item.failure_count >= 3;
                    return (
                      <tr key={index} style={{ background: isThreat ? "#FFF5F5" : "inherit" }}>
                        <td style={{ fontWeight: 600 }}>{item.email}</td>
                        <td style={{ fontFamily: "monospace" }}>{item.ip_address || "—"}</td>
                        <td style={{
                          textAlign: "center", fontWeight: 700,
                          color: isThreat ? "#DC2626" : "#475569"
                        }}>
                          {item.failure_count}
                        </td>
                        <td style={{ fontSize: 12, color: "#64748B" }}>
                          {new Date(item.last_attempt).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Authentication Alerts Feed */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>Recent Security Incident Feed</h2>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: "center", padding: 30, color: "#64748B" }}>
                      No logged alerts.
                    </td>
                  </tr>
                ) : (
                  alerts.map(alert => (
                    <tr key={alert.id}>
                      <td style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 500, color: "#991B1B" }}>
                          Failed attempt: {alert.user_email}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                          IP: {alert.ip_address} | {alert.user_agent?.substring(0, 50)}...
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
