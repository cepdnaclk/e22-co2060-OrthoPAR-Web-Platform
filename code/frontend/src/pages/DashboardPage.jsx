import { useState, useCallback, useEffect } from "react";
import { C, STATUS_COLORS, getScoreStatus } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import { getPatients } from "../utils/api.js";

function Dashboard({ onAnalyze }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) { setUploadedFile(file); setProgress(0); }
  }, []);

  const handleAnalyze = () => {
    setIsProcessing(true);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => onAnalyze(), 400); }
      setProgress(Math.min(p, 100));
    }, 150);
  };

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
          <div className="section-title">Quick Upload</div>
        </div>
        <div
          className={`drop-zone${isDragOver ? " drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input").click()}
        >
          <input
            id="file-input" type="file" accept=".stl,.obj,.ply"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files[0]; if (f) { setUploadedFile(f); setProgress(0); }}}
          />
          <div className="drop-icon">{Icons.upload}</div>
          {uploadedFile ? (
            <>
              <div className="drop-title" style={{ color: C.blue }}>✓ {uploadedFile.name}</div>
              <div className="drop-sub">File ready for analysis</div>
            </>
          ) : (
            <>
              <div className="drop-title">Drag & Drop 3D Oral Scan here to start</div>
              <div className="drop-sub">or click to browse your files</div>
            </>
          )}
          <div className="drop-formats">
            {[".STL", ".OBJ", ".PLY"].map(f => <span key={f} className="format-badge">{f}</span>)}
          </div>
        </div>

        {isProcessing && (
          <div className="upload-progress fade-in">
            <div className="progress-label">
              <span className={progress < 100 ? "processing" : ""}>
                {progress < 100 ? "Analyzing landmarks & computing PAR metrics…" : "Analysis complete!"}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {uploadedFile && !isProcessing && (
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button className="analyze-btn" onClick={handleAnalyze}>
              {Icons.scan}
              Run PAR Analysis
            </button>
            <button className="btn-secondary" style={{ flex: "none" }} onClick={() => { setUploadedFile(null); setProgress(0); }}>
              Remove
            </button>
          </div>
        )}
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