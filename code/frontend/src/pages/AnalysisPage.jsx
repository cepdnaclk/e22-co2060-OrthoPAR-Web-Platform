import { useState, useEffect } from "react";
import { PAR_WEIGHTS, C, STATUS_COLORS, calcPARPoints, getScoreStatus } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import ThreeViewer from "../components/ThreeViewer.jsx";
import { getPatient, extractLandmarks, calculateScore } from "../utils/api.js";

function AnalysisStudio({ patientId }) {
  const [showUpper, setShowUpper] = useState(true);
  const [showLower, setShowLower] = useState(true);
  const [highlightLandmarks, setHighlightLandmarks] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [aiValues, setAiValues] = useState(null);
  const [patient, setPatient] = useState(null);

  // Visit selector state
  const [selectedVisitIdx, setSelectedVisitIdx] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    const processPatient = async () => {
      setLoading(true);
      setError("");
      setAiValues(null);
      setPatient(null);
      setSelectedVisitIdx(null);

      try {
        setLoadingStep("Fetching patient context...");
        const p = await getPatient(patientId);
        if (!isMounted) return;
        setPatient(p);

        // Determine the active visit (default to the latest)
        const visits = p.visits || [];
        if (visits.length === 0) {
          setLoadingStep("No visits found for this patient. Please upload scans first.");
          setLoading(false);
          return;
        }

        const latestIdx = visits.length - 1;
        setSelectedVisitIdx(latestIdx);
        const activeVisit = visits[latestIdx];

        // If a PAR score already exists for this visit, show it immediately
        if (activeVisit.par_scores && activeVisit.par_scores.length > 0) {
          setAiValues(activeVisit.par_scores[activeVisit.par_scores.length - 1]);
          setLoading(false);
          return;
        }

        // No score yet — run ML pipeline if scans exist
        const scans = activeVisit.scans || [];
        if (scans.length === 0) {
          setLoadingStep("No 3D scans found for this visit. Please upload scans from the Dashboard.");
          setLoading(false);
          return;
        }

        setLoadingStep("Running TensorFlow ML Models (Extracting Landmarks)...");
        await Promise.all(scans.map(s => extractLandmarks(s.id)));

        setLoadingStep("Computing PAR Mathematical Indices...");
        const score = await calculateScore(activeVisit.id);

        if (!isMounted) return;
        setAiValues(score);

        // Re-fetch so scans have populated landmarks for the 3D viewer
        setLoadingStep("Loading landmark positions into 3D viewer...");
        const refreshed = await getPatient(patientId);
        if (!isMounted) return;
        setPatient(refreshed);
        setSelectedVisitIdx(refreshed.visits.length - 1);

        setLoading(false);

      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError(err.message || "An unexpected error occurred.");
        setLoading(false);
      }
    };

    processPatient();
    return () => { isMounted = false; };
  }, [patientId]);

  // When user switches visit from the selector dropdown
  const handleVisitChange = (idx) => {
    setSelectedVisitIdx(idx);
    const visit = patient?.visits?.[idx];
    if (!visit) return;
    if (visit.par_scores && visit.par_scores.length > 0) {
      setAiValues(visit.par_scores[visit.par_scores.length - 1]);
    } else {
      setAiValues(null);
    }
    setOverrides({});
  };

  if (!patientId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textMuted }}>
        Select a patient from the Dashboard or Patients page to begin analysis.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.textMuted }}>
        <div className="processing" style={{ width: 40, height: 40, borderRadius: "50%", background: C.blueLight, border: `2px solid ${C.blue}`, marginBottom: 20 }} />
        <div style={{ fontWeight: 600, color: C.text, fontSize: 16 }}>{loadingStep}</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>This may take a moment.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: C.textMuted }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontWeight: 600, color: C.red, fontSize: 15 }}>Analysis Error</div>
        <div style={{ fontSize: 13, color: C.textSub, maxWidth: 380, textAlign: "center" }}>{error}</div>
      </div>
    );
  }

  if (!aiValues) {
    // Patient loaded but no scores yet (e.g. no scans uploaded)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: C.textMuted }}>
        <div style={{ fontSize: 32 }}>🦷</div>
        <div style={{ fontWeight: 600, color: C.text, fontSize: 15 }}>{patient?.name || "Patient"}</div>
        <div style={{ fontSize: 13, color: C.textSub, textAlign: "center", maxWidth: 360 }}>{loadingStep || "No PAR score data available. Upload 3D scans from the Dashboard to begin."}</div>
      </div>
    );
  }

  const visits = patient?.visits || [];
  const activeVisit = visits[selectedVisitIdx] ?? null;
  const activeScans = activeVisit?.scans || [];

  // Map PAR_WEIGHTS frontend keys → backend ParScoreResponse field names
  // PAR_WEIGHTS keys: overjet, overbite, midlineShift, upperCrowding, lowerCrowding, buccalOcclusion
  const dbKeyMap = {
    overjet: "overjet_score",
    overbite: "overbite_score",
    midlineShift: "centreline_score",
    upperCrowding: "upper_anterior_score",
    lowerCrowding: "lower_anterior_score",
    buccalOcclusion: "buccal_occlusion_antero_posterior_score",
  };

  const effectiveValues = Object.fromEntries(
    Object.keys(PAR_WEIGHTS).map(k => {
      const aiVal = aiValues[dbKeyMap[k]] || 0;
      return [k, overrides[k] !== undefined ? overrides[k] : aiVal];
    })
  );

  const pointsMap = Object.fromEntries(
    Object.keys(PAR_WEIGHTS).map(k => [k, calcPARPoints(k, effectiveValues[k])])
  );

  const totalScore = Object.values(pointsMap).reduce((a, b) => a + b, 0);
  const status = getScoreStatus(totalScore);
  const statusColors = STATUS_COLORS[status];
  const modifiedCount = Object.keys(overrides).filter(k => overrides[k] !== "").length;

  const handleOverride = (metric, val) => {
    setOverrides(prev => ({ ...prev, [metric]: val }));
  };

  const handleSave = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); };

  const scoreBarColor =
    status === "Critical" ? "#EF4444" :
    status === "Moderate" ? "#F59E0B" : "#10B981";

  const maxPAR = 50;
  const barPct = Math.min((totalScore / maxPAR) * 100, 100);

  return (
    <div className="studio" style={{ height: "100%" }}>
      {/* 3D Viewer Panel */}
      <div className="viewer-panel">
        <div className="viewer-topbar">
          <div className="viewer-title">{patient ? patient.name : 'Unknown'} — 3D Scan Viewer</div>
          <div className="viewer-controls">
            {/* Visit Selector */}
            {visits.length > 0 && (
              <select
                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "white", color: C.text, cursor: "pointer", marginRight: 8 }}
                value={selectedVisitIdx ?? ""}
                onChange={e => handleVisitChange(Number(e.target.value))}
              >
                {visits.map((v, i) => (
                  <option key={v.id} value={i}>
                    Visit {i + 1} — {new Date(v.visit_date).toLocaleDateString()} ({v.status})
                  </option>
                ))}
              </select>
            )}
            <button className={`viewer-btn${showUpper ? " active" : ""}`} onClick={() => setShowUpper(v => !v)}>
              {Icons.eye} Upper Jaw
            </button>
            <button className={`viewer-btn${showLower ? " active" : ""}`} onClick={() => setShowLower(v => !v)}>
              {Icons.eye} Lower Jaw
            </button>
            <button className={`viewer-btn${highlightLandmarks ? " active" : ""}`} onClick={() => setHighlightLandmarks(v => !v)}>
              {Icons.tooth} Landmarks
            </button>
          </div>
        </div>
        <div className="viewer-canvas">
          <ThreeViewer
            showUpper={showUpper}
            showLower={showLower}
            highlightLandmarks={highlightLandmarks}
            scans={activeScans}
          />
          <div className="viewer-badge">
            Status: <span>{aiValues.model_version === "manual" ? "Manual Inference" : "AI Predicted"}</span>
          </div>
          <div className="rotate-hint">Drag to rotate · Scroll to zoom</div>
        </div>
      </div>

      {/* Scorecard Panel */}
      <div className="scorecard">
        <div className="scorecard-header">
          <div className="score-display">
            <div className="score-number">{totalScore}</div>
            <div className="score-label">PAR Index Score</div>
          </div>
          {/* Visit info badge */}
          {activeVisit && (
            <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, marginBottom: 4 }}>
              📅 {new Date(activeVisit.visit_date).toLocaleDateString()} · <span style={{ color: C.blue }}>{activeVisit.status}</span>
              {visits.length > 1 && <span style={{ color: C.textMuted }}> · Visit {selectedVisitIdx + 1}/{visits.length}</span>}
            </div>
          )}
          <div className="score-status-row">
            <span className="badge" style={{ background: statusColors.bg, color: statusColors.text }}>
              <span className="badge-dot" style={{ background: statusColors.dot }} />
              {status}
            </span>
            <div className="score-bar-wrap">
              <div className="score-bar" style={{ width: `${barPct}%`, background: scoreBarColor }} />
            </div>
            <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
              {totalScore} / {maxPAR} max
            </span>
          </div>
          {modifiedCount > 0 && (
            <div className="modified-count" style={{ marginTop: 10 }}>
              <span>⚠</span> {modifiedCount} metric{modifiedCount > 1 ? "s" : ""} manually overridden
            </div>
          )}
        </div>

        <div className="scorecard-body">
          <table className="override-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>AI Calculated</th>
                <th>Manual Input</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PAR_WEIGHTS).map(([key, meta]) => {
                const aiVal = aiValues[dbKeyMap[key]] || 0;
                const manualVal = overrides[key] !== undefined ? overrides[key] : "";
                const isOverridden = manualVal !== "" && Number(manualVal) !== aiVal;
                const pts = pointsMap[key];
                return (
                  <tr key={key} className={`metric-row${isOverridden ? " modified" : ""}`}>
                    <td className="metric-cell">
                      <div className="metric-name">{meta.label}</div>
                      <div className="metric-unit">{meta.unit}</div>
                    </td>
                    <td className="metric-cell">
                      <span className={`ai-value${isOverridden ? " struck" : ""}`}>{aiVal}</span>
                    </td>
                    <td className="metric-cell">
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          className={`manual-input${isOverridden ? " overridden" : ""}`}
                          placeholder={aiVal}
                          value={manualVal}
                          step="0.1"
                          onChange={e => handleOverride(key, e.target.value)}
                        />
                        {isOverridden && <span className="manual-badge">MANUAL</span>}
                      </div>
                    </td>
                    <td className="points-cell">
                      <div>{pts}</div>
                      <div className="pts-label">pts</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="scorecard-footer">
          <div className="total-row">
            <div>
              <div className="total-label">Total PAR Score</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                Weighted sum of all 6 metrics
              </div>
            </div>
            <div className="total-score">{totalScore}</div>
          </div>
          <div className="action-btns">
            <button className="btn-secondary" onClick={handleSave}>
              {Icons.pdf}
              {savedMsg ? "Saved!" : "Save PDF"}
            </button>
            <button className="btn-secondary" onClick={() => setOverrides({})}>
              {Icons.refresh}
              Reset Inputs
            </button>
            <button className="btn-primary">
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisStudio;