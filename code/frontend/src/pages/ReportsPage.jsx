import React, { useState, useEffect } from "react";
import { getReports } from "../utils/api";
import { C } from "../utils/constants.js";
import { useNavigate } from "react-router-dom";

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReports() {
      try {
        const data = await getReports();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => 
    r.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.hospital_patient_id && r.hospital_patient_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getScoreColor = (score) => {
    if (score < 15) return "#10b981"; // Good
    if (score < 30) return "#f59e0b"; // Moderate
    return "#ef4444"; // Severe
  };

  if (loading) {
    return (
      <div className="content fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="content fade-in">
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: C.text }}>Reports Engine</h1>
          <p style={{ color: C.textMuted, margin: "8px 0 0 0" }}>Historical PAR index assessments and clinical outcomes</p>
        </div>
        
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search patient or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "10px 16px",
              paddingLeft: 40,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.bgLight,
              color: C.text,
              width: 280,
              outline: "none",
              transition: "all 0.2s"
            }}
          />
          <span style={{ position: "absolute", left: 14, top: 10, opacity: 0.5 }}>🔍</span>
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fee2e2", color: "#b91c1c", borderRadius: 12, marginBottom: 24 }}>
          Error: {error}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: C.textMuted, background: C.bgLight, borderRadius: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h3>No reports found</h3>
          <p>Complete an analysis in the Studio to generate a report.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.02)" }}>
                <th style={{ padding: "16px 24px", fontWeight: 600, color: C.textMuted, fontSize: 13 }}>PATIENT</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, color: C.textMuted, fontSize: 13 }}>DATE</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, color: C.textMuted, fontSize: 13 }}>PAR SCORE</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, color: C.textMuted, fontSize: 13 }}>MODEL VERSION</th>
                <th style={{ padding: "16px 24px", fontWeight: 600, color: C.textMuted, fontSize: 13, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} className="table-row" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{report.patient_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{report.hospital_patient_id || "No Hospital ID"}</div>
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: 14 }}>{new Date(report.calculated_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{new Date(report.calculated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: `${getScoreColor(report.final_score)}15`,
                      color: getScoreColor(report.final_score),
                      fontWeight: 700,
                      fontSize: 18
                    }}>
                      {report.final_score}
                    </div>
                  </td>
                  <td style={{ padding: "20px 24px" }}>
                    <span style={{ 
                      padding: "4px 10px", 
                      borderRadius: 6, 
                      background: C.bgLight, 
                      fontSize: 12, 
                      fontWeight: 500,
                      color: C.textMuted,
                      border: `1px solid ${C.border}`
                    }}>
                      {report.model_version || "Manual"}
                    </span>
                  </td>
                  <td style={{ padding: "20px 24px", textAlign: "right" }}>
                    <button 
                      onClick={() => navigate(`/patients/${report.patient_id}`)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: C.primary,
                        color: "white",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "transform 0.1s"
                      }}
                      onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                    >
                      View Patient
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;