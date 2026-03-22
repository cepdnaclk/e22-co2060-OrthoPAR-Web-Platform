import { useState } from "react";
import { PAR_WEIGHTS, MOCK_AI_VALUES, C, STATUS_COLORS, calcPARPoints, getScoreStatus } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import ThreeViewer from "../components/ThreeViewer.jsx";

function AnalysisStudio() {
  const [showUpper, setShowUpper] = useState(true);
  const [showLower, setShowLower] = useState(true);
  const [highlightLandmarks, setHighlightLandmarks] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);

  const effectiveValues = Object.fromEntries(
    Object.keys(MOCK_AI_VALUES).map(k => [k, overrides[k] !== undefined ? overrides[k] : MOCK_AI_VALUES[k]])
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
          <div className="viewer-title">3D Scan Viewer</div>
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
          <ThreeViewer showUpper={showUpper} showLower={showLower} highlightLandmarks={highlightLandmarks} />
          <div className="viewer-badge">
            Scan: <span>PT-2041.stl</span> &nbsp;·&nbsp; Vertices: <span>48,203</span>
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
                const aiVal = MOCK_AI_VALUES[key];
                const manualVal = overrides[key] !== undefined ? overrides[key] : "";
                const isOverridden = manualVal !== "" && manualVal !== aiVal;
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
              Re-calculate
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