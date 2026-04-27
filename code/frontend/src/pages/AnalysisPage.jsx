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
  const [aiValues, setAiValues] = useState(null);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    const processPatient = async () => {
      setLoading(true);
      try {
        setLoadingStep("Fetching patient context...");
        const p = await getPatient(patientId);
        if (!isMounted) return;
        setPatient(p);

        if (p.par_scores && p.par_scores.length > 0) {
          setAiValues(p.par_scores[p.par_scores.length - 1]);
          setLoading(false);
          return;
        }

        const scans = p.scans || [];
        if (scans.length === 0) {
          setLoadingStep("No 3D scans found for this patient.");
          return;
        }

        setLoadingStep("Running TensorFlow ML Models (Extracting Landmarks)...");
        await Promise.all(scans.map(s => extractLandmarks(s.id)));

        setLoadingStep("Computing PAR Mathematical Indices...");
        const score = await calculateScore(patientId);
        
        if (!isMounted) return;
        setAiValues(score);
        setLoading(false);

      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setLoadingStep("Error: " + err.message);
      }
    };
    
    processPatient();
    return () => { isMounted = false; };
  }, [patientId]);

  if (!patientId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textMuted }}>
        Select a patient from the Dashboard or Patients page to begin analysis.
      </div>
    );
  }

  if (loading || !aiValues) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.textMuted }}>
        <div className="processing" style={{ width: 40, height: 40, borderRadius: "50%", background: C.blueLight, border: `2px solid ${C.blue}`, marginBottom: 20 }} />
        <div style={{ fontWeight: 600, color: C.text, fontSize: 16 }}>{loadingStep}</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>This may take a moment.</div>
      </div>
    );
  }

  // Map frontend component keys to backend ParScoreResponse schema keys
  const dbKeyMap = {
    upper_anterior: "upper_anterior_score",
    lower_anterior: "lower_anterior_score",
    buccal_ap: "buccal_occlusion_antero_posterior_score",
    buccal_transverse: "buccal_occlusion_transverse_score",
    buccal_vertical: "buccal_occlusion_vertical_score",
    overjet: "overjet_score",
    overbite: "overbite_score",
    centreline: "centreline_score"
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
          <div className="viewer-title">{patient ? patient.name : 'Unknown'} - 3D Scan Viewer</div>
          <div className="viewer-controls">
            <button
              className={`viewer-btn${showUpper ? " active" : ""}`}
              onClick={() => setShowUpper(v => !v)}
            >
              {Icons.eye} Upper Jaw
            </button>
            <button
              className={`viewer-btn${showLower ? " active" : ""}`}
              onClick={() => setShowLower(v => !v)}
            >
              {Icons.eye} Lower Jaw
            </button>
            <button
              className={`viewer-btn${highlightLandmarks ? " active" : ""}`}
              onClick={() => setHighlightLandmarks(v => !v)}
            >
              {Icons.tooth} Landmarks
            </button>
          </div>
        </div>
        <div className="viewer-canvas">
          <ThreeViewer 
            showUpper={showUpper} 
            showLower={showLower} 
            highlightLandmarks={highlightLandmarks} 
            scans={patient?.scans || []} 
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
                      <span className={`ai-value${isOverridden ? " struck" : ""}`}>
                        {aiVal}
                      </span>
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