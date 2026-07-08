import { useState, useEffect } from "react";
import { getPendingUsers, approveUser, rejectUser } from "../../utils/api.js";

export default function PendingApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [modalType, setModalType] = useState(null); // 'approve' | 'reject'

  const fetchPending = async () => {
    try {
      const data = await getPendingUsers();
      setPending(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load pending queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async () => {
    if (!actioningId) return;
    try {
      if (modalType === "approve") {
        await approveUser(actioningId, actionReason);
      } else {
        await rejectUser(actioningId, actionReason);
      }
      setModalType(null);
      setActioningId(null);
      setActionReason("");
      fetchPending();
    } catch (err) {
      setError(err.message || "Action failed.");
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading pending approvals queue...</div>;
  }

  return (
    <div>
      {error && <div className="admin-badge rejected" style={{ marginBottom: 20, width: "100%", borderRadius: 8 }}>{error}</div>}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Registration Requests Waiting for Approval</h2>
          <span className="admin-badge pending">{pending.length} Requests</span>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Registration Date</th>
                <th>Clinician Name</th>
                <th>Email</th>
                <th>Specialty Specialty</th>
                <th>Hospital / Clinic</th>
                <th>SLMC Reg No.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
                    No pending registration approvals in queue!
                  </td>
                </tr>
              ) : (
                pending.map(user => (
                  <tr key={user.id}>
                    <td>{new Date(user.created_at || Date.now()).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="admin-badge clinician" style={{ background: "#F0FDF4", color: "#166534" }}>
                        {user.specialty || "General Dentist"}
                      </span>
                    </td>
                    <td>{user.hospital_name || "—"}</td>
                    <td>
                      <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>
                        {user.slmc_registration_number || "—"}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="admin-btn primary"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          onClick={() => {
                            setActioningId(user.id);
                            setModalType("approve");
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="admin-btn danger"
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                          onClick={() => {
                            setActioningId(user.id);
                            setModalType("reject");
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation dialog overlay */}
      {modalType && (
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
              {modalType === "approve" ? "Approve Clinician Registration" : "Reject Registration Request"}
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", margin: "0 0 16px 0" }}>
              Are you sure you want to {modalType} this clinician account? This action will generate an audit entry.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
                Reason / Note (Optional)
              </label>
              <textarea
                style={{
                  width: "100%", padding: 10, border: "1px solid #E2E8F0",
                  borderRadius: 8, height: "70px", outline: "none", fontSize: 13
                }}
                placeholder="e.g. Credentials verified against SLMC registry."
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="admin-btn secondary"
                onClick={() => {
                  setModalType(null);
                  setActioningId(null);
                  setActionReason("");
                }}
              >
                Cancel
              </button>
              <button
                className={modalType === "approve" ? "admin-btn primary" : "admin-btn danger"}
                onClick={handleAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
