import { useState, useEffect } from "react";
import { getAdminAuditLogs } from "../../utils/api.js";

export default function AdminAuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Filters state
  const [userEmail, setUserEmail] = useState("");
  const [action, setAction] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const nextSkip = reset ? 0 : skip;
      const data = await getAdminAuditLogs({
        user_email: userEmail || undefined,
        action: action || undefined,
        log_status: logStatus || undefined,
        from_date: fromDate ? new Date(fromDate).toISOString() : undefined,
        to_date: toDate ? new Date(toDate).toISOString() : undefined,
        skip: nextSkip,
        limit: 30,
      });

      if (reset) {
        setLogs(data);
        setSkip(30);
      } else {
        setLogs(prev => [...prev, ...data]);
        setSkip(prev => prev + 30);
      }

      setHasMore(data.length === 30);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to query audit logs.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [userEmail, action, logStatus, fromDate, toDate]);

  return (
    <div>
      {error && <div className="admin-badge rejected" style={{ marginBottom: 20, width: "100%", borderRadius: 8 }}>{error}</div>}

      {/* Filter panel */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-body" style={{ padding: 18 }}>
          <div className="admin-filters" style={{ margin: 0, gap: 10 }}>
            <input
              type="text"
              className="admin-input"
              placeholder="Search by User Email..."
              style={{ flex: 1, minWidth: "180px" }}
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
            />
            
            <input
              type="text"
              className="admin-input"
              placeholder="Action (e.g. VISITS_CREATED)..."
              style={{ width: "200px" }}
              value={action}
              onChange={e => setAction(e.target.value)}
            />

            <select
              className="admin-select"
              value={logStatus}
              onChange={e => setLogStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="date"
                className="admin-input"
                style={{ padding: "6px 12px" }}
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
              <span style={{ fontSize: 12, color: "#64748B" }}>to</span>
              <input
                type="date"
                className="admin-input"
                style={{ padding: "6px 12px" }}
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabular Audit Table */}
      <div className="admin-card">
        <div className="admin-card-body" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }} />
                <th style={{ width: "170px" }}>Timestamp (UTC)</th>
                <th style={{ width: "210px" }}>Initiated By</th>
                <th style={{ width: "200px" }}>Action Event</th>
                <th style={{ width: "90px" }}>Status</th>
                <th>Activity Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
                    No audit records match the selected query.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td style={{ textAlign: "center", fontSize: "11px", color: "#64748B" }}>
                          {isExpanded ? "▼" : "▶"}
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748B" }}>
                          {new Date(log.timestamp).toUTCString()}
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.user_email || "System"}</td>
                        <td>
                          <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, fontSize: "11.5px" }}>
                            {log.action}
                          </code>
                        </td>
                        <td>
                          <span className={`admin-badge ${log.status === "success" ? "approved" : "rejected"}`}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>{log.summary}</td>
                      </tr>

                      {/* Expandable JSON details panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" style={{ background: "#F8FAFC", padding: "16px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "16px", marginBottom: 12 }}>
                              <div>
                                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "block" }}>
                                  HTTP Request Details
                                </span>
                                <code style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                                  {log.http_method || "—"} {log.endpoint || "—"}
                                </code>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "block" }}>
                                  Network IP Context
                                </span>
                                <span style={{ fontSize: 12.5, display: "block", marginTop: 4, fontFamily: "monospace" }}>
                                  {log.ip_address || "Unknown"}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "block" }}>
                                  Browser User Agent
                                </span>
                                <span style={{ fontSize: 11.5, color: "#475569", display: "block", marginTop: 4 }}>
                                  {log.user_agent || "Unknown Agent"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, display: "block", marginBottom: 6 }}>
                                Raw JSON Metadata Parameters
                              </span>
                              <pre style={{
                                background: "#0F172A", color: "#38BDF8", padding: 12,
                                borderRadius: 8, overflowX: "auto", fontSize: 12, margin: 0,
                                fontFamily: "monospace"
                              }}>
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            className="admin-btn secondary"
            disabled={loadingMore}
            onClick={() => fetchLogs(false)}
          >
            {loadingMore ? "Loading..." : "Load More Logs"}
          </button>
        </div>
      )}
    </div>
  );
}

// Inline inject React fallback if React is not globally imported
import React from "react";
