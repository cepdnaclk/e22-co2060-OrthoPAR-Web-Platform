import { useState, useEffect } from "react";
import { PAR_WEIGHTS, C, STATUS_COLORS, calcPARPoints, getScoreStatus, METRIC_STL_MAP, MEASURE_STEPS } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import ThreeViewer from "../components/ThreeViewer.jsx";
import { getPatient, extractLandmarks, calculateScore } from "../utils/api.js";

function AnalysisStudio({ patientId }) {
  const [showUpper, setShowUpper] = useState(true);
  const [showLower, setShowLower] = useState(true);
  const [showBuccal, setShowBuccal] = useState(true);
  const [highlightLandmarks, setHighlightLandmarks] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);

  // Measurement tool state
  const [activeMeasureMetric, setActiveMeasureMetric] = useState(null);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [isOverrideMode, setIsOverrideMode] = useState(false);

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
    setActiveMeasureMetric(null);
    setMeasurePoints([]);
    setIsOverrideMode(false);
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

  const startMeasurement = (metric) => {
    setActiveMeasureMetric(metric);
    setMeasurePoints([]);
  };

  const handleAddMeasurePoint = (point) => {
    const newPoints = [...measurePoints, point];
    setMeasurePoints(newPoints);

    if (newPoints.length === 2) {
      // Calculate Euclidean distance
      const p1 = newPoints[0];
      const p2 = newPoints[1];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      const distWorld = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // Since ThreeViewer scales by 0.1, the world distance is 0.1x the STL (mm) distance.
      // So real distance in mm = distWorld * 10.
      const distMm = (distWorld * 10).toFixed(1);
      
      handleOverride(activeMeasureMetric, distMm);
      
      // Keep displaying the measurement briefly, or clear it
      setTimeout(() => {
        setActiveMeasureMetric(null);
        setMeasurePoints([]);
      }, 500);
    }
  };

  const handleSave = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); };

  // Derive per-step guidance: which jaw to show and what instruction to display
  const measureSteps = activeMeasureMetric ? MEASURE_STEPS[activeMeasureMetric] : null;
  const currentStep  = measureSteps ? measureSteps[measurePoints.length] : null;

  // Buttons reflect the step-level STL when measuring, otherwise manual toggles
  const stepVis   = currentStep?.stl || (activeMeasureMetric ? METRIC_STL_MAP[activeMeasureMetric] : null);
  const btnUpper  = stepVis ? stepVis.upper  : showUpper;
  const btnLower  = stepVis ? stepVis.lower  : showLower;
  const btnBuccal = stepVis ? stepVis.buccal : showBuccal;

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
            <button className={`viewer-btn${btnUpper ? " active" : ""}`} onClick={() => setShowUpper(v => !v)}>
              {Icons.eye} Upper Jaw
            </button>
            <button className={`viewer-btn${btnLower ? " active" : ""}`} onClick={() => setShowLower(v => !v)}>
              {Icons.eye} Lower Jaw
            </button>
            <button className={`viewer-btn${btnBuccal ? " active" : ""}`} onClick={() => setShowBuccal(v => !v)}>
              {Icons.eye} Buccal
            </button>
            <button className={`viewer-btn${highlightLandmarks ? " active" : ""}`} onClick={() => setHighlightLandmarks(v => !v)}>
              {Icons.tooth} Landmarks
            </button>
          </div>
        </div>
        <div className="viewer-canvas" style={{ position: "relative" }}>
          {activeMeasureMetric && currentStep && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10,
              background: C.blue, color: "white", padding: "10px 18px", borderRadius: 20, 
              fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", gap: 8, maxWidth: "80%", textAlign: "center"
            }}>
              {Icons.ruler}
              {currentStep.prompt}
              <button 
                onClick={() => { setActiveMeasureMetric(null); setMeasurePoints([]); }}
                style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", marginLeft: 8, padding: 4, flexShrink: 0 }}
                title="Cancel"
              >✕</button>
            </div>
          )}
          <ThreeViewer
            showUpper={showUpper}
            showLower={showLower}
            showBuccal={showBuccal}
            stepVisibility={stepVis || undefined}
            highlightLandmarks={highlightLandmarks}
            scans={activeScans}
            activeMeasureMetric={activeMeasureMetric}
            measurePoints={measurePoints}
            onAddMeasurePoint={handleAddMeasurePoint}
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
                <th>{isOverrideMode ? "Manual Input" : "Final Value"}</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PAR_WEIGHTS).map(([key, meta]) => {
                const aiVal = aiValues[dbKeyMap[key]] || 0;
                const manualVal = overrides[key] !== undefined ? overrides[key] : "";
                const isOverridden = manualVal !== "" && Number(manualVal) !== aiVal;
                const finalVal = isOverridden ? Number(manualVal) : aiVal;
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
                      {isOverrideMode ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input
                            type="number"
                            className={`manual-input${isOverridden ? " overridden" : ""}`}
                            placeholder={aiVal}
                            value={manualVal}
                            step="0.1"
                            onChange={e => handleOverride(key, e.target.value)}
                          />
                          {MEASURE_STEPS[key] ? (
                            <button
                              onClick={() => startMeasurement(key)}
                              style={{
                                background: activeMeasureMetric === key ? C.blueLight : "transparent",
                                color: activeMeasureMetric === key ? C.blue : C.textMuted,
                                border: `1px solid ${activeMeasureMetric === key ? C.blue : C.border}`,
                                borderRadius: 4, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                              }}
                              title={`Measure ${meta.label} on 3D Model`}
                            >
                              {Icons.ruler}
                            </button>
                          ) : (
                            <span
                              title="Composite score — enter 0–4 directly"
                              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 11, cursor: "default", border: `1px dashed ${C.border}`, borderRadius: 4 }}
                            >—</span>
                          )}
                          {isOverridden && <span className="manual-badge">MANUAL</span>}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: isOverridden ? C.blue : C.text }}>
                          {finalVal}
                          {isOverridden && <span className="manual-badge">MANUAL</span>}
                        </div>
                      )}
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
            {!isOverrideMode ? (
              <>
                <button className="btn-secondary" onClick={handleSave}>
                  {Icons.pdf}
                  {savedMsg ? "Saved to Record!" : "Save to Patient Record"}
                </button>
                <button className="btn-secondary" onClick={() => setOverrides({})}>
                  {Icons.refresh}
                  Reset
                </button>
                <button className="btn-primary" onClick={() => setIsOverrideMode(true)}>
                  Manual Override
                </button>
              </>
            ) : (
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => setIsOverrideMode(false)}>
                Regenerate Score
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalysisStudio;