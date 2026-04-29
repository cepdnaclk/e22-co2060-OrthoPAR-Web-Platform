import { useState, useEffect } from "react";
import { getPatients, getPatient, createPatient, createVisit } from "../utils/api.js";
import { C } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import "./PatientsPage.css";

// Report icon SVG
const ReportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

function VisitHistoryPanel({ patient, onAnalyzeVisit }) {
  const visits = patient?.visits || [];

  if (visits.length === 0) {
    return (
      <div style={{ padding: "14px 20px 14px 56px", fontSize: 13, color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
        No visits recorded yet.
      </div>
    );
  }

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: "#FAFBFD" }}>
      {/* Header row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr 120px",
        padding: "8px 20px 8px 56px",
        fontSize: 11,
        fontWeight: 700,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div>Visit Date</div>
        <div>Status</div>
        <div>PAR Score</div>
        <div>Scans</div>
        <div></div>
      </div>

      {[...visits].reverse().map((v, i) => {
        const latestScore = v.par_scores?.length > 0
          ? v.par_scores[v.par_scores.length - 1].final_score
          : null;
        const scanCount = v.scans?.length ?? 0;

        const statusColors = {
          "Pre-Treatment": { bg: "#EFF6FF", text: "#2563EB" },
          "Mid-Treatment": { bg: "#FFFBEB", text: "#D97706" },
          "Post-Treatment": { bg: "#F0FDF4", text: "#16A34A" },
        };
        const sc = statusColors[v.status] || { bg: C.blueLight, text: C.blue };

        return (
          <div
            key={v.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 120px",
              padding: "10px 20px 10px 56px",
              alignItems: "center",
              fontSize: 13,
              borderBottom: i < visits.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <div style={{ color: C.text, fontWeight: 500 }}>
              📅 {new Date(v.visit_date).toLocaleDateString()}
            </div>
            <div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, fontWeight: 600 }}>
                {v.status}
              </span>
            </div>
            <div style={{ fontWeight: 600, color: latestScore !== null ? C.text : C.textMuted }}>
              {latestScore !== null ? `${latestScore} pts` : "—"}
            </div>
            <div style={{ color: C.textSub }}>
              {scanCount > 0 ? `${scanCount} scan${scanCount !== 1 ? "s" : ""}` : <span style={{ color: C.textMuted }}>None</span>}
            </div>
            <div>
              <button
                onClick={() => onAnalyzeVisit(patient.id)}
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: `1px solid ${C.blue}`,
                  background: "white",
                  color: C.blue,
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.background = C.blue; e.target.style.color = "white"; }}
                onMouseLeave={e => { e.target.style.background = "white"; e.target.style.color = C.blue; }}
              >
                Analyze →
              </button>
            </div>
          </div>
        );
      })}

      {/* Footer action for full report */}
      <div style={{ padding: "12px 20px 12px 56px", background: "#F1F5F9", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.textSub }}>
          Total of {visits.length} visit{visits.length !== 1 ? 's' : ''} recorded.
        </div>
        <button
          onClick={() => onViewReport && onViewReport(patient.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <ReportIcon /> View Detailed Trend Report
        </button>
      </div>
    </div>
  );
}

function PatientsPage({ onAnalyze, onViewReport }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Expanded row state: maps patient.id → full patient object (with visits)
  const [expandedId, setExpandedId] = useState(null);
  const [expandedData, setExpandedData] = useState({});
  const [expandLoading, setExpandLoading] = useState(false);

  // Modal form state
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState("Active");
  const [newMRN, setNewMRN] = useState("");
  const [newDOB, setNewDOB] = useState("");
  const [newGender, setNewGender] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => { fetchPatients(); }, []);

  const handleToggleExpand = async (patientId) => {
    // Collapse if already expanded
    if (expandedId === patientId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(patientId);

    // If we haven't loaded this patient's full details yet, fetch them
    if (!expandedData[patientId]) {
      setExpandLoading(true);
      try {
        const full = await getPatient(patientId);
        setExpandedData(prev => ({ ...prev, [patientId]: full }));
      } catch (err) {
        console.error("Failed to load patient details", err);
      } finally {
        setExpandLoading(false);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const patient = await createPatient(newName, newStatus, newMRN, newDOB, newGender);
      await createVisit(patient.id, "Initial Consultation", "Pre-Treatment");
      await fetchPatients();

      setShowModal(false);
      setNewName(""); setNewStatus("Active"); setNewMRN(""); setNewDOB(""); setNewGender("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
            <input className="search-input" placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ flex: 'none', width: 'auto' }} onClick={() => setShowModal(true)}>
            {Icons.plus} Add Patient
          </button>
        </div>

        {/* Patient Table */}
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
              {/* Column Headers */}
              <div className="table-header" style={{ gridTemplateColumns: "36px 1.5fr 2fr 1fr 1fr 80px 120px" }}>
                <div></div>
                <div>Patient Name</div>
                <div>ID / MRN</div>
                <div>Status</div>
                <div>Visits</div>
                <div>Created</div>
                <div>Actions</div>
              </div>

              {filtered.map(p => {
                const status = (p.treatment_status || "active").toLowerCase();
                const isCompleted = status === "completed";
                const isPending = status === "pending";
                const bg = isCompleted ? C.greenLight : isPending ? C.amberLight : C.blueLight;
                const text = isCompleted ? C.green : isPending ? C.amber : C.blue;
                const dot = isCompleted ? C.green : isPending ? C.amber : C.blue;
                const isExpanded = expandedId === p.id;
                const fullPatient = expandedData[p.id];

                return (
                  <div key={p.id}>
                    {/* Patient Row */}
                    <div
                      className="table-row"
                      style={{ gridTemplateColumns: "36px 1.5fr 2fr 1fr 1fr 80px 120px", cursor: "pointer", background: isExpanded ? "#F0F7FF" : "white" }}
                      onClick={() => handleToggleExpand(p.id)}
                    >
                      {/* Expand chevron */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: isExpanded ? C.blue : "#94A3B8", fontSize: 28, lineHeight: 1, paddingBottom: 4, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                        ›
                      </div>
                      <div style={{ fontWeight: 600, color: C.text }}>{p.name}</div>
                      <div>
                        <div className="patient-id" style={{ fontSize: 11 }}>{p.id}</div>
                        {p.hospital_patient_id && (
                          <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>MRN: {p.hospital_patient_id}</div>
                        )}
                      </div>
                      <div>
                        <span className="badge" style={{ background: bg, color: text }}>
                          <span className="badge-dot" style={{ background: dot }} />
                          {p.treatment_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        {(p.visits?.length ?? "—")} visit{p.visits?.length !== 1 ? "s" : ""}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </div>
                      {/* Report icon button */}
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          title="View Patient Report"
                          onClick={() => onViewReport && onViewReport(p.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "5px 10px",
                            borderRadius: 7,
                            border: "1px solid #6366F1",
                            background: "#EEF2FF",
                            color: "#6366F1",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#6366F1"; }}
                        >
                          <ReportIcon /> Report
                        </button>
                      </div>
                    </div>

                    {/* Expanded History Panel */}
                    {isExpanded && (
                      expandLoading && !fullPatient ? (
                        <div style={{ padding: "12px 20px 12px 56px", fontSize: 13, color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
                          Loading visit history…
                        </div>
                      ) : (
                        <VisitHistoryPanel
                          patient={fullPatient || p}
                          onAnalyzeVisit={(id) => { if (onAnalyze) onAnalyze(id); }}
                        />
                      )
                    )}
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
              <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>Enter the patient's details to create a new profile.</div>

              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" placeholder="e.g. John Doe" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus />
                  </div>

                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">DOB <span style={{ color: "#888", fontWeight: "normal" }}>(Opt)</span></label>
                      <input className="form-input" type="date" value={newDOB} onChange={e => setNewDOB(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Gender</label>
                      <select className="form-select" value={newGender} onChange={e => setNewGender(e.target.value)}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hospital Patient ID (MRN)</label>
                    <input className="form-input" placeholder="e.g. MRN-5092" value={newMRN} onChange={e => setNewMRN(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Treatment Status</label>
                    <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {error && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{error}</div>}
                </div>

                <div className="modal-actions">
                  <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
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