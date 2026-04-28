import { useState, useCallback, useEffect, useRef } from "react";
import { C, STATUS_COLORS, getScoreStatus } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import { getPatients, uploadScan } from "../utils/api.js";
import "./DashboardPage.css"; // Moved inline styles into this file

function Dashboard({ onAnalyze }) {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload Flow State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [scans, setScans] = useState({ upper: null, lower: null, buccal: null });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");

  // --- Data Fetching ---
  // Load patients immediately on mount to populate the dropdown
  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Handlers ---
  // Update state when a new file is picked for a specific jaw segment
  const handleFileChange = (type, file) => {
    setScans(prev => ({ ...prev, [type]: file }));
  };

  // Validate and orchestrate the upload of all three required scans
  const handleUploadAndAnalyze = async () => {
    if (!selectedPatientId) return setUploadError("Please select a patient first.");
    if (!scans.upper || !scans.lower || !scans.buccal) return setUploadError("Please select all 3 scans.");
    
    setUploading(true);
    setUploadError("");
    
    try {
      // Sequentially upload each model segment to the selected patient's bucket
      setUploadProgress("Uploading Upper Arch...");
      await uploadScan(selectedPatientId, "Upper Arch Segment", scans.upper);
      
      setUploadProgress("Uploading Lower Arch...");
      await uploadScan(selectedPatientId, "Lower Arch Segment", scans.lower);
      
      setUploadProgress("Uploading Buccal Segment...");
      await uploadScan(selectedPatientId, "Buccal Segment", scans.buccal);
      
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
      <div className="stat-grid">
        {[
          { label: "Total Patients", value: "247", delta: "+12 this month", accent: C.blue },
          { label: "Analyzed Today", value: "8", delta: "3 critical", accent: C.red },
          { label: "Avg PAR Score", value: "14.2", delta: "↓ 2.1 vs last month", accent: C.green },
          { label: "Reports Saved", value: "1,083", delta: "PDF + DOCX", accent: C.amber },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ "--accent": s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="upload-card">
        <div className="section-header">
          <div className="section-title">New Scan Analysis</div>
        </div>
        
        {/* Step 1: Patient Selection Box */}
        <div className="dashboard-section-wrap">
          <label className="dashboard-label">
            1. Select Patient
          </label>
          <select 
            className="search-input dashboard-select" 
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            disabled={uploading}
          >
            <option value="">-- Choose a patient --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name} (ID: {p.id.split("-")[0]})</option>
            ))}
          </select>
        </div>

        {/* Step 2: Extracting STL Files via File Inputs */}
        <div className="dashboard-section-wrap">
          <label className="dashboard-label">
            2. Upload 3D Intraoral Scans
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
                    onChange={(e) => { if(e.target.files[0]) handleFileChange(scan.id, e.target.files[0]) }}
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
            <div key={p.id} className="table-row" onClick={onAnalyze}>
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