import { useState, useEffect } from "react";
import { getAdminUsers, approveUser, rejectUser, disableUser, changeUserRole } from "../../utils/api.js";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Action state
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'role' | 'disable' | 'approve' | 'reject'
  const [actionReason, setActionReason] = useState("");
  const [newRole, setNewRole] = useState("clinician");

  const fetchUsers = async () => {
    try {
      const data = await getAdminUsers();
      setUsers(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load user list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async () => {
    if (!selectedUser) return;
    try {
      if (actionType === "approve") {
        await approveUser(selectedUser.id, actionReason);
      } else if (actionType === "reject") {
        await rejectUser(selectedUser.id, actionReason);
      } else if (actionType === "disable") {
        await disableUser(selectedUser.id, actionReason);
      } else if (actionType === "role") {
        await changeUserRole(selectedUser.id, newRole, actionReason);
      }
      
      setActionType(null);
      setSelectedUser(null);
      setActionReason("");
      fetchUsers();
    } catch (err) {
      setError(err.message || "Action failed.");
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading user base list...</div>;
  }

  return (
    <div>
      {error && <div className="admin-badge rejected" style={{ marginBottom: 20, width: "100%", borderRadius: 8 }}>{error}</div>}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Registered Clinicians & System Administrators</h2>
          <span className="admin-badge admin">{users.length} Total Accounts</span>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Specialty & Affiliation</th>
                <th>Role</th>
                <th>Account Status</th>
                <th>Activity Stats</th>
                <th>Action Controls</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0F172A" }}>{u.full_name}</div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>{u.email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{u.specialty || "General Dentist"}</div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{u.hospital_name || "Private Practice"}</div>
                  </td>
                  <td>
                    <span className={`admin-badge ${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${u.account_status}`}>
                      {u.account_status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12.5px", color: "#475569" }}>
                    <div>Actions Logged: <strong style={{ color: "#0F172A" }}>{u.action_count}</strong></div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: 2 }}>
                      Active: {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.account_status !== "approved" && (
                        <button
                          className="admin-btn primary"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => {
                            setSelectedUser(u);
                            setActionType("approve");
                          }}
                        >
                          Approve
                        </button>
                      )}
                      
                      {u.account_status === "pending" && (
                        <button
                          className="admin-btn danger"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => {
                            setSelectedUser(u);
                            setActionType("reject");
                          }}
                        >
                          Reject
                        </button>
                      )}

                      {u.account_status === "approved" && u.role !== "admin" && (
                        <button
                          className="admin-btn danger"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => {
                            setSelectedUser(u);
                            setActionType("disable");
                          }}
                        >
                          Disable
                        </button>
                      )}

                      <button
                        className="admin-btn secondary"
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        onClick={() => {
                          setSelectedUser(u);
                          setActionType("role");
                          setNewRole(u.role);
                        }}
                      >
                        Role Change
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Action Dialog Overlay */}
      {actionType && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#FFFFFF", padding: 24, borderRadius: 12,
            width: "400px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>
              {actionType === "role" && "Modify User System Role"}
              {actionType === "disable" && "Suspend/Disable User Account"}
              {actionType === "approve" && "Approve Account Request"}
              {actionType === "reject" && "Reject Account Request"}
            </h3>
            
            <p style={{ fontSize: 13.5, color: "#475569", margin: "0 0 16px 0" }}>
              Target user: <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </p>

            {actionType === "role" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                  Select New Role
                </label>
                <select
                  className="admin-select"
                  style={{ width: "100%" }}
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="clinician">Clinician (Doctor / Resident / Student)</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                Change Log Notes / Rationale (Optional)
              </label>
              <textarea
                style={{
                  width: "100%", padding: 10, border: "1px solid #E2E8F0",
                  borderRadius: 8, height: "70px", outline: "none", fontSize: 13
                }}
                placeholder="Brief justification for system auditing logs."
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="admin-btn secondary"
                onClick={() => {
                  setActionType(null);
                  setSelectedUser(null);
                  setActionReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="admin-btn primary"
                onClick={handleAction}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
