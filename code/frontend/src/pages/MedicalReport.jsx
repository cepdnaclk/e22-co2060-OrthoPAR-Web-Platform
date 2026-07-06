import React from "react";
import "./MedicalReport.css";

/**
 * Professional Medical PAR Index Report Component
 * Designed for A4 Printing and Clinical Audit
 */
const MedicalReport = React.forwardRef(({ data, visitId }, ref) => {
  if (!data || !data.patient) return null;

  const { patient, clinician, visits, trend } = data;
  
  // Find specific visit data if visitId is provided, otherwise latest
  const activeVisit = visitId 
    ? visits.find(v => v.id === visitId) 
    : visits[visits.length - 1];

  if (!activeVisit || !activeVisit.score_details) {
    return <div className="no-print">No PAR score data available for this visit.</div>;
  }

  const scores = activeVisit.score_details;
  
  // PAR Metric Weights (International Standard)
  const metricConfig = [
    { label: "Upper Anterior Segment", raw: scores.upper_anterior_score, weight: 1 },
    { label: "Lower Anterior Segment", raw: scores.lower_anterior_score, weight: 1 },
    { label: "Overjet", raw: scores.overjet_score, weight: 6 },
    { label: "Overbite", raw: scores.overbite_score, weight: 2 },
    { label: "Centreline", raw: scores.centreline_score, weight: 4 },
    { label: "Buccal A-P (R+L)", raw: scores.buccal_occlusion_antero_posterior_score, weight: 1 },
    { label: "Buccal Transverse (R+L)", raw: scores.buccal_occlusion_transverse_score, weight: 1 },
    { label: "Buccal Vertical (R+L)", raw: scores.buccal_occlusion_vertical_score, weight: 1 },
  ];

  // Improvement Category
  const getOutcomeStatus = () => {
    if (trend.overall_delta === null) return { label: "Baseline Assessment", class: "status-improved" };
    if (trend.overall_delta <= -22) return { label: "Greatly Improved", class: "status-great" };
    if (trend.overall_pct_improvement >= 30) return { label: "Improved", class: "status-improved" };
    return { label: "Stable / Monitoring", class: "status-warning" };
  };

  const status = getOutcomeStatus();

  return (
    <div className="medical-report" ref={ref}>
      {/* HEADER */}
      <header className="report-header">
        <div className="hospital-brand">
          <div className="hospital-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2C9 2 7 4 7 6c0 1.5.5 3 1 4.5L9 15c.5 2 1 4 2.5 5.5.5.5 1 .5 1 .5s.5 0 1-.5C15 19 15.5 17 16 15l1-4.5c.5-1.5 1-3 1-4.5 0-2-2-4-5-4z" />
            </svg>
          </div>
          <div>
            <div className="hospital-name">OrthoPAR Studio</div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Clinical Analysis & Research Unit</div>
          </div>
        </div>
        <div className="document-meta">
          <h1 className="document-title">PAR Index Assessment Report</h1>
          <div className="document-ref">REF: {activeVisit.id.slice(0,8).toUpperCase()} | {new Date().toLocaleDateString()}</div>
        </div>
      </header>

      {/* INFORMATION GRID */}
      <div className="info-grid">
        {/* Patient Info */}
        <div className="info-column">
          <div className="info-section-title">Patient Identification</div>
          <div className="data-row">
            <span className="data-label">Name</span>
            <span className="data-value">{patient.name}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Hospital ID (MRN)</span>
            <span className="data-value">{patient.hospital_patient_id || "N/A"}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Gender / DOB</span>
            <span className="data-value">{patient.gender} | {new Date(patient.date_of_birth).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Clinician Info */}
        <div className="info-column">
          <div className="info-section-title">Clinical Context</div>
          <div className="data-row">
            <span className="data-label">Consultant</span>
            <span className="data-value">{clinician.full_name}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Reg. No (SLMC)</span>
            <span className="data-value">{clinician.slmc_registration_number}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Visit Phase</span>
            <span className="data-value">{activeVisit.status}</span>
          </div>
        </div>
      </div>

      {/* SCORE DASHBOARD */}
      <div className="score-dashboard">
        <div className="main-score">
          <div className="score-label">Total Weighted PAR Score</div>
          <div className="score-value">{scores.final_score}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="score-label" style={{ marginBottom: '8px' }}>Clinical Outcome</div>
          <div className={`status-badge ${status.class}`}>{status.label}</div>
          {trend.overall_pct_improvement && (
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669', marginTop: '8px' }}>
              {trend.overall_pct_improvement}% Cumulative Improvement
            </div>
          )}
        </div>
      </div>

      {/* DETAILED METRICS */}
      <div className="info-section-title">Peer Assessment Rating (PAR) Breakdown</div>
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Assessment Component</th>
            <th>Raw Score</th>
            <th>Weight</th>
            <th style={{ textAlign: 'right' }}>Weighted Points</th>
          </tr>
        </thead>
        <tbody>
          {metricConfig.map((m, i) => (
            <tr key={i}>
              <td>{m.label}</td>
              <td>{m.raw}</td>
              <td>× {m.weight}</td>
              <td style={{ textAlign: 'right' }} className="metric-points">{m.raw * m.weight}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid #1e3a8a' }}>
            <td colSpan="3" style={{ fontWeight: 800, textTransform: 'uppercase' }}>Sum of Weighted Points</td>
            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', color: '#1e3a8a' }}>{scores.final_score}</td>
          </tr>
        </tbody>
      </table>

      {/* CLINICAL NOTES */}
      <div className="info-section-title">Clinician Remarks</div>
      <div style={{ minHeight: '80px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#334155', border: '1px solid #e2e8f0' }}>
        {activeVisit.notes || "No clinical notes recorded for this visit."}
      </div>

      {/* FOOTER */}
      <footer className="report-footer">
        <div>
          <div className="qr-placeholder">
            VERIFY<br/>RECORD
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '5px' }}>
            AI Inference: {scores.model_version}<br/>
            Generated via OrthoPAR Cloud
          </div>
        </div>
        <div className="signature-area">
          <div className="signature-line">
            Consultant Signature & Date
          </div>
        </div>
      </footer>

      <div className="disclaimer">
        Disclaimer: This report is an AI-assisted clinical assessment tool. 
        Final diagnostic decisions should be made by a qualified healthcare professional 
        following verification of the 3D dental records.
      </div>
    </div>
  );
});

export default MedicalReport;
