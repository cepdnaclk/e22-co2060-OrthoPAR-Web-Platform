import { useState, useEffect } from "react";
import { getPatients, createPatient } from "../utils/api.js";
import { C, STATUS_COLORS } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import "./PatientsPage.css";

function PatientsPage() {
  // --- State Variables ---
  // The complete list of patients fetched from the API
  const [patients, setPatients] = useState([]);
  // Determines if the initial data fetch is still running
  const [loading, setLoading] = useState(true);
  // Value of the search bar used to filter the patients table
  const [search, setSearch] = useState("");
  // Controls the visibility of the "Create New Patient" popup modal
  const [showModal, setShowModal] = useState(false);

  // --- Create Modal Form State ---
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  // Set to true when sending the POST request to prevent double-submissions
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Reusable function to fetch the latest patients from the backend.
   * Gets called on initial component mount and whenever a new patient is created.
   */
  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients as soon as the page loads
  useEffect(() => {
    fetchPatients();
  }, []);

  /**
   * Handles the submission of the "Create New Patient" form.
   * It sends a POST request with the new name and status, then refreshes the table upon success.
   */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      // API call to the backend endpoint
      await createPatient(newName, newStatus);
      // Wait for the server to successfully save and return, then fetch the updated list
      await fetchPatients();
      
      // Reset form and close modal
      setShowModal(false);
      setNewName("");
      setNewStatus("Active");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute the list of patients to display in the table based on the search query.
  // We check if the search string is a substring of the patient's ID or name.
  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="content fade-in" style={{ padding: 0 }}>
        {/* Top Controls */}
        <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, background: "white" }}>
          <div className="search-wrap">
            <span className="search-icon">{Icons.search}</span>
            <input 
              className="search-input" 
              placeholder="Search patients…" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" style={{ flex: 'none', width: 'auto' }} onClick={() => setShowModal(true)}>
            {Icons.plus} Add Patient
          </button>
        </div>

        {/* Patients Table */}
        <div style={{ padding: "24px 28px" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: "40px" }}>Loading patients…</div>
          ) : patients.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textMuted, padding: "40px", border: `1px dashed ${C.border}`, borderRadius: 12, background: "white" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 600, color: C.text, fontSize: 16 }}>No patients yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Click 'Add Patient' to create your first record.</div>
            </div>
          ) : (
            <div className="table-card">
              <div className="table-header" style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1fr" }}>
                <div>Patient Name</div>
                <div>ID</div>
                <div>Status</div>
                <div>Created</div>
              </div>
              {filtered.map(p => {
                // Determine a color based on treatment status
                const isCompleted = p.treatment_status.toLowerCase() === "completed";
                const isPending = p.treatment_status.toLowerCase() === "pending";
                const bg = isCompleted ? C.greenLight : isPending ? C.amberLight : C.blueLight;
                const text = isCompleted ? C.green : isPending ? C.amber : C.blue;
                const dot = isCompleted ? C.green : isPending ? C.amber : C.blue;

                return (
                  <div key={p.id} className="table-row" style={{ gridTemplateColumns: "1.5fr 2fr 1fr 1fr" }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div className="patient-id" style={{ fontSize: 11 }}>{p.id}</div>
                    <div>
                      <span className="badge" style={{ background: bg, color: text }}>
                        <span className="badge-dot" style={{ background: dot }} />
                        {p.treatment_status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSub }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && patients.length > 0 && (
                <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                  No patients match your search.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-title">Create New Patient</div>
              <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>
                Enter the patient's details to create a new profile.
              </div>
              
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      className="form-input" 
                      placeholder="e.g. John Doe" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Treatment Status</label>
                    <select 
                      className="form-select" 
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  {error && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{error}</div>}
                </div>
                
                <div className="modal-actions">
                  <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-btn modal-btn-save" disabled={submitting || !newName.trim()}>
                    {submitting ? "Saving…" : "Create Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default PatientsPage;