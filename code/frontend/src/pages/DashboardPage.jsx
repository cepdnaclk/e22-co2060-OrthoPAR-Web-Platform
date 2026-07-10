import { useState, useCallback, useEffect, useRef } from "react";
import { C, STATUS_COLORS, getScoreStatus } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import { getPatients, uploadScan, getPatient, createVisit, getActiveMLModel } from "../utils/api.js";
import "./DashboardPage.css"; // Moved inline styles into this file

function Dashboard({ onAnalyze }) {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState(null);

  // Upload Flow State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState(""); // Fix 1: Track specific visit
  const [patientVisits, setPatientVisits] = useState([]);   // Fix 1: Local cache of visits
  const [scans, setScans] = useState({ upper: null, lower: null, buccal: null });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadMode, setUploadMode] = useState("new"); // "new" or "overwrite"

  // --- Data Fetching ---
  // Load patients immediately on mount to populate the dropdown
  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));

    getActiveMLModel()
      .then(setActiveModel)
      .catch(err => {
        if (!err.message.includes("No active model found")) {
          console.error("Failed to fetch active model:", err);
        }
      });
  }, []);

  // Fix 1: Load visits when patient is selected
  useEffect(() => {
    if (!selectedPatientId) {
      setPatientVisits([]);
      setSelectedVisitId("");
      return;
    }
    getPatient(selectedPatientId)
      .then(p => {
        const visits = p.visits || [];
        setPatientVisits(visits);
        // If no visits exist, default to "new". Otherwise, let user choose.
        setSelectedVisitId(visits.length === 0 ? "new" : visits[visits.length - 1].id);
      })
      .catch(err => setUploadError("Failed to load patient visits: " + err.message));
  }, [selectedPatientId]);

  // --- Handlers ---
  // Update state when a new file is picked for a specific jaw segment
  const handleFileChange = (type, file) => {
    setScans(prev => ({ ...prev, [type]: file }));
  };

  // Validate and orchestrate the upload of all three required scans
  const handleUploadAndAnalyze = async () => {
    if (!selectedPatientId) return setUploadError("Please select a patient first.");
    if (!selectedVisitId) return setUploadError("Please select a visit or create a new one.");
    if (!scans.upper || !scans.lower || !scans.buccal) return setUploadError("Please select all 3 scans.");

    setUploading(true);
    setUploadError("");

    try {
      setUploadProgress("Aligning medical visit routing context...");
      
      let targetVisitId = null;

      // Fix 1: Handle explicit visit selection or new creation
      if (selectedVisitId === "new") {
          setUploadProgress("Creating new progress visit record...");
          const newVisit = await createVisit(
            selectedPatientId, 
            `Follow-up Analysis (${new Date().toLocaleDateString()})`, 
            "In-Progress"
          );
          targetVisitId = newVisit.id;
      } else if (selectedVisitId) {
          targetVisitId = selectedVisitId;
      } else {
        // BACKWARD COMPATIBILITY: Auto-generate a Visit if a legacy Patient lacks one
        setUploadProgress("Legacy Patient detected. Auto-generating Initial Visit...");
        const newVisit = await createVisit(selectedPatientId, "Initial Appointment", "Pre-Treatment");
        targetVisitId = newVisit.id;
      }
      
      if (!targetVisitId) {
          throw new Error("Unable to establish a secure Visit context string.");
      }

      // Sequentially upload each model segment to the selected visit bucket
      setUploadProgress("Uploading Upper Arch...");
      await uploadScan(targetVisitId, "Upper Arch Segment", scans.upper);

      setUploadProgress("Uploading Lower Arch...");
      await uploadScan(targetVisitId, "Lower Arch Segment", scans.lower);

      setUploadProgress("Uploading Buccal Segment...");
      await uploadScan(targetVisitId, "Buccal Segment", scans.buccal);

      setUploadProgress("Success! Starting Analysis...");

      // Delay briefly to show success, then jump straight into Analysis Studio
      setTimeout(() => {
        setUploading(false);
        onAnalyze(selectedPatientId);
      }, 800);

    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
    }
  };

  // Filter logic for recent activity table
  const filtered = patients.filter(p =>
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>

      <div className="upload-card">
        <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="section-title">New Scan Analysis</div>
          {activeModel && (
            <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: "#F1F5F9", padding: "4px 10px", borderRadius: 12, border: `1px solid ${C.border}` }}>
              <span style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }}></span>
              <span style={{ color: C.textMuted }}>Scoring Engine:</span> 
              <strong style={{ color: C.textDark }}>{activeModel.name} {activeModel.version}</strong>
            </div>
          )}
        </div>

        {/* Step 1 & 2: Selection (Patient Left, Visit Far Right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "24px" }}>
          <div className="dashboard-section-wrap" style={{ marginBottom: 0, width: "100%", maxWidth: "340px" }}>
            <label className="dashboard-label">
              1. Select Patient
            </label>
            <select 
              className="search-input dashboard-select" 
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              disabled={uploading}
              style={{ paddingLeft: "12px" }}
            >
              <option value="">-- Choose a patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id.split("-")[0]})</option>
              ))}
            </select>
          </div>

          <div className="dashboard-section-wrap" style={{ marginBottom: 0, width: "100%", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "100%", maxWidth: "500px" }}>
              <label className="dashboard-label">
                2. Target Visit
              </label>
              <select 
                className="search-input dashboard-select" 
                value={selectedVisitId}
                onChange={e => setSelectedVisitId(e.target.value)}
                disabled={uploading || !selectedPatientId}
                style={{ 
                  borderColor: selectedVisitId === "new" ? C.blue : "inherit",
                  paddingLeft: "12px"
                }}
              >
                {patientVisits.length > 0 ? (
                  patientVisits.map((v, i) => (
                    <option key={v.id} value={v.id}>
                      Visit {i + 1}: {new Date(v.visit_date).toLocaleDateString()} ({v.status})
                    </option>
                  ))
                ) : (
                  <option value="">No existing visits</option>
                )}
                <option value="new" style={{ fontWeight: "bold", color: C.blue }}>+ Record as New Progress Visit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Extracting STL Files via File Inputs */}
        <div className="dashboard-section-wrap">
          <label className="dashboard-label">
            3. Upload 3D Intraoral Scans
          </label>

          <div className="scan-picker-list">
            {[
              { id: 'upper', label: "Upper Arch" },
              { id: 'lower', label: "Lower Arch" },
              { id: 'buccal', label: "Buccal Segment" },
            ].map(scan => (
              <div key={scan.id} className="scan-picker-item">
                <label className={`btn-secondary scan-picker-btn ${uploading ? "disabled" : ""}`}>
                  Select File
                  <input
                    type="file"
                    accept=".stl,.obj,.ply"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={(e) => { if (e.target.files[0]) handleFileChange(scan.id, e.target.files[0]) }}
                  />
                </label>
                <div className={`scan-picker-status ${scans[scan.id] ? "selected" : ""}`}>
                  {scans[scan.id] ? (
                    <span className="scan-status-success">
                      <span>✓</span> {scans[scan.id].name}
                    </span>
                  ) : (
                    `Missing ${scan.label} (.STL)`
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback / Progress Messages */}
        {uploadError && <div className="dashboard-error-msg">{uploadError}</div>}
        {uploading && (
          <div className="dashboard-progress-msg">
            <span className="processing" /> {uploadProgress}
          </div>
        )}

        <button
          className="analyze-btn dashboard-analyze-btn"
          disabled={!selectedPatientId || !scans.upper || !scans.lower || !scans.buccal || uploading}
          onClick={handleUploadAndAnalyze}
        >
          {Icons.upload}
          {uploading ? "Uploading Scans..." : "Upload & Analyze"}
        </button>
      </div>

      <div className="table-card">
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="section-title">Recent Activity</div>
          <div className="search-wrap">
            <span className="search-icon">{Icons.search}</span>
            <input className="search-input" style={{ width: 180 }} placeholder="Filter by Patient ID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-header">
          <div>Patient ID</div>
          <div>Date</div>
          <div>PAR Score</div>
          <div>Status</div>
        </div>
        {filtered.map(p => {
          // Determine status colors based on real treatment_status from the database
          const isCompleted = p.treatment_status.toLowerCase() === "completed";
          const isPending = p.treatment_status.toLowerCase() === "pending";
          const sc = {
            bg: isCompleted ? C.greenLight : isPending ? C.amberLight : C.blueLight,
            text: isCompleted ? C.green : isPending ? C.amber : C.blue,
            dot: isCompleted ? C.green : isPending ? C.amber : C.blue
          };

          return (
            <div key={p.id} className="table-row" onClick={() => onAnalyze(p.id)}>
              <div className="patient-id">{p.id}</div>
              <div style={{ fontSize: 13, color: C.textSub }}>
                {new Date(p.created_at).toLocaleDateString()}
              </div>
              <div className="score-cell">
                {p.par_score !== null ? p.par_score : "--"} <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>pts</span>
              </div>
              <div>
                <span className="badge" style={{ background: sc.bg, color: sc.text }}>
                  <span className="badge-dot" style={{ background: sc.dot }} />
                  {p.treatment_status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;