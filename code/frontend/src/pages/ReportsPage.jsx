import React, { useState, useEffect } from "react";
import { getPatientReport } from "../utils/api";
import { C } from "../utils/constants.js";
import "./ReportsPage.css";

// ─── Small helpers ────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  if (score === null || score === undefined)
    return <span style={{ color: C.textMuted }}>—</span>;
  const color =
    score < 15 ? "#10b981" : score < 30 ? "#f59e0b" : "#ef4444";
  const label = score < 15 ? "Good" : score < 30 ? "Moderate" : "Severe";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${color}18`,
        color,
        fontWeight: 700,
        fontSize: 13,
        padding: "4px 10px",
        borderRadius: 20,
        border: `1px solid ${color}40`,
      }}
    >
      {score} pts
      <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.85 }}>
        {label}
      </span>
    </span>
  );
}

function TrendBadge({ direction, delta, pct }) {
  if (!direction)
    return (
      <span style={{ color: C.textMuted, fontSize: 12 }}>Baseline</span>
    );

  const cfg = {
    improving: { icon: "↑", color: "#10b981", bg: "#d1fae5", label: "Improving" },
    worsening: { icon: "↓", color: "#ef4444", bg: "#fee2e2", label: "Worsening" },
    stable:    { icon: "→", color: "#6366f1", bg: "#e0e7ff", label: "Stable" },
  }[direction];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        fontSize: 12,
        padding: "3px 9px",
        borderRadius: 20,
      }}
    >
      {cfg.icon} {cfg.label}
      {delta !== null && (
        <span style={{ fontWeight: 500, opacity: 0.85 }}>
          ({delta > 0 ? "+" : ""}{delta} pts)
        </span>
      )}
    </span>
  );
}

function InfoCard({ label, value, sub }) {
  return (
    <div
      style={{
        background: "#F8FAFD",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
        {value || <span style={{ color: C.textMuted }}>—</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    "Pre-Treatment":  { bg: "#EFF6FF", color: "#2563EB" },
    "Mid-Treatment":  { bg: "#FFFBEB", color: "#D97706" },
    "Post-Treatment": { bg: "#F0FDF4", color: "#16A34A" },
  };
  const c = map[status] || { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

// ─── Trend analytics mini-chart (pure CSS bars) ───────────────────────────────
function TrendChart({ entries }) {
  if (!entries || entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.par_score));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginTop: 4 }}>
      {entries.map((e, i) => {
        const pct = max > 0 ? (e.par_score / max) * 100 : 0;
        const color =
          e.par_score < 15 ? "#10b981" : e.par_score < 30 ? "#f59e0b" : "#ef4444";
        return (
          <div
            key={e.visit_id}
            title={`Visit ${i + 1}: ${e.par_score} pts`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color }}>
              {e.par_score}
            </div>
            <div
              style={{
                width: "100%",
                height: `${pct}%`,
                minHeight: 6,
                background: color,
                borderRadius: "4px 4px 0 0",
                opacity: 0.85,
                transition: "height 0.4s",
              }}
            />
            <div style={{ fontSize: 9, color: C.textMuted, textAlign: "center" }}>
              V{i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function ReportsPage({ patientId, onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedVisit, setExpandedVisit] = useState(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      setError("No patient selected.");
      return;
    }
    setLoading(true);
    setError(null);
    getPatientReport(patientId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  // ── Loading ──
  if (loading) {
    return (
      <div
        className="content fade-in"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
      >
        <div style={{ textAlign: "center", color: C.textMuted }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid #E2E8F0",
              borderTopColor: "#6366F1",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontSize: 14 }}>Loading report…</div>
        </div>
      </div>
    );
  }

  // ── Error / empty state ──
  if (error || !report) {
    return (
      <div className="content fade-in">
        <button
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 24, fontSize: 13, fontWeight: 600,
            color: "#6366F1", background: "none", border: "none", cursor: "pointer",
          }}
        >
          ← Back to Patients
        </button>
        <div
          style={{
            textAlign: "center", padding: "80px 0", color: C.textMuted,
            background: "#F8FAFD", borderRadius: 20, border: "1px dashed #CBD5E1",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            {error || "Report unavailable"}
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            Navigate to Patients, then click the Report button on any patient row.
          </div>
        </div>
      </div>
    );
  }

  const { patient, clinician, visits, trend } = report;

  // ── Gender icon ──
  const genderIcon = patient.gender === "Male" ? "♂" : patient.gender === "Female" ? "♀" : "⚥";

  // ── Age helper ──
  const calcAge = (dob) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };
  const age = calcAge(patient.date_of_birth);

  return (
    <div className="content fade-in" style={{ padding: "24px 28px", overflowY: "auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rpt-section { margin-bottom: 28px; }
        .rpt-section-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #94A3B8; margin-bottom: 12px;
          padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;
        }
      `}</style>

      {/* ── Back + Page Title ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "#6366F1",
              background: "#EEF2FF", border: "1px solid #C7D2FE",
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#6366F1"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = "#6366F1"; }}
          >
            ← Patients
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: C.text }}>
              {patient.name}
            </h1>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              {patient.hospital_patient_id ? `MRN: ${patient.hospital_patient_id}` : "No MRN"} &nbsp;·&nbsp;
              Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            color: "white",
            borderRadius: 12,
            padding: "10px 18px",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {trend.scored_visits > 0
              ? report.visits.filter((v) => v.par_score !== null).slice(-1)[0]?.par_score ?? "—"
              : "—"}
          </div>
          <div style={{ opacity: 0.85 }}>Latest PAR</div>
        </div>
      </div>

      {/* ── Two-column top area ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Patient Demographics */}
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div className="rpt-section-title">Patient Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoCard label="Full Name" value={patient.name} />
            <InfoCard
              label="Date of Birth"
              value={patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString("en-GB")
                : null}
              sub={age ? `${age} years old` : null}
            />
            <InfoCard
              label="Gender"
              value={patient.gender ? `${genderIcon} ${patient.gender}` : null}
            />
            <InfoCard
              label="Treatment Status"
              value={<StatusPill status={patient.treatment_status} />}
            />
            <InfoCard label="Hospital Patient ID (MRN)" value={patient.hospital_patient_id} />
            <InfoCard
              label="Registered On"
              value={new Date(patient.created_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            />
          </div>
        </div>

        {/* Clinician + Overall Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Clinician */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, flex: 1 }}>
            <div className="rpt-section-title">Clinician</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoCard label="Name" value={clinician.full_name} />
              <InfoCard label="Specialty" value={clinician.specialty} />
              <InfoCard label="Hospital / Institution" value={clinician.hospital_name} />
              <InfoCard label="SLMC Reg. No." value={clinician.slmc_registration_number} />
            </div>
          </div>

          {/* Summary stats */}
          <div
            style={{
              background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
              borderRadius: 14,
              padding: "18px 20px",
              color: "white",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 14 }}>
              Treatment Summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Total Visits", val: trend.total_visits },
                { label: "Scored Visits", val: trend.scored_visits },
                {
                  label: "Overall Δ",
                  val: trend.overall_delta !== null
                    ? `${trend.overall_delta > 0 ? "+" : ""}${trend.overall_delta}`
                    : "—",
                },
              ].map(({ label, val }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{val}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {trend.overall_pct_improvement !== null && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {trend.overall_pct_improvement >= 0 ? (
                  <span style={{ color: "#34D399" }}>
                    ↑ {trend.overall_pct_improvement}% improvement overall
                  </span>
                ) : (
                  <span style={{ color: "#F87171" }}>
                    ↓ {Math.abs(trend.overall_pct_improvement)}% worsening overall
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PAR Score Chart ── */}
      {trend.entries.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Chart Card */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
            <div className="rpt-section-title">PAR Score Progression</div>
            <TrendChart entries={trend.entries} />
            <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { color: "#10b981", label: "Good (< 15)" },
                { color: "#f59e0b", label: "Moderate (15–29)" },
                { color: "#ef4444", label: "Severe (≥ 30)" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textSub }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Trend Metrics Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, flex: 1 }}>
              <div className="rpt-section-title">Latest Trend Metrics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: "10px 14px", background: "#F8FAFD", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Rolling Average (3)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
                    {trend.entries[trend.entries.length - 1]?.rolling_avg ?? "—"} <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>pts</span>
                  </div>
                </div>
                <div style={{ padding: "10px 14px", background: "#F8FAFD", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Percentage Improvement</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: trend.overall_pct_improvement >= 0 ? "#10B981" : "#EF4444" }}>
                    {trend.overall_pct_improvement !== null ? `${trend.overall_pct_improvement}%` : "—"}
                  </div>
                </div>
                <div style={{ padding: "10px 14px", background: "#F8FAFD", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Trend Direction</div>
                  <div style={{ marginTop: 4 }}>
                    <TrendBadge
                      direction={trend.entries[trend.entries.length - 1]?.direction}
                      delta={trend.entries[trend.entries.length - 1]?.delta}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trend Analytics Table ── */}
      {trend.entries.length > 0 && (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div className="rpt-section-title">Trend Analytics</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                  {["Visit", "Date", "Status", "PAR Score", "Δ Change", "Direction", "% Improvement", "Rolling Avg (3)"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.entries.map((entry, i) => (
                  <tr
                    key={entry.visit_id}
                    style={{
                      borderBottom: "1px solid #F1F5F9",
                      background: i % 2 === 0 ? "white" : "#FAFBFD",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F0F4FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "white" : "#FAFBFD")}
                  >
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#6366F1" }}>
                      Visit {i + 1}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: C.textSub, whiteSpace: "nowrap" }}>
                      {new Date(entry.visit_date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <StatusPill status={entry.visit_status} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <ScoreBadge score={entry.par_score} />
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>
                      {entry.delta !== null ? (
                        <span style={{ color: entry.delta < 0 ? "#10b981" : entry.delta > 0 ? "#ef4444" : "#6366f1" }}>
                          {entry.delta > 0 ? "+" : ""}{entry.delta} pts
                        </span>
                      ) : (
                        <span style={{ color: C.textMuted }}>Baseline</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <TrendBadge direction={entry.direction} delta={null} pct={null} />
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>
                      {entry.pct_improvement !== null ? (
                        <span style={{ color: entry.pct_improvement >= 0 ? "#10b981" : "#ef4444" }}>
                          {entry.pct_improvement >= 0 ? "↑" : "↓"} {Math.abs(entry.pct_improvement)}%
                        </span>
                      ) : (
                        <span style={{ color: C.textMuted }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub, fontWeight: 500 }}>
                      {entry.rolling_avg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Visit History (all visits) ── */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
        <div className="rpt-section-title">
          All Visits &nbsp;<span style={{ color: "#6366F1", fontWeight: 700 }}>{visits.length}</span>
        </div>

        {visits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 13 }}>
            No visits recorded yet.
          </div>
        ) : (
          [...visits].reverse().map((v, i) => {
            const isOpen = expandedVisit === v.id;
            return (
              <div
                key={v.id}
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  marginBottom: 10,
                  overflow: "hidden",
                  transition: "box-shadow 0.2s",
                  boxShadow: isOpen ? "0 2px 12px rgba(99,102,241,0.10)" : "none",
                }}
              >
                {/* Visit header row */}
                <div
                  onClick={() => setExpandedVisit(isOpen ? null : v.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 40px",
                    alignItems: "center",
                    padding: "12px 18px",
                    cursor: "pointer",
                    background: isOpen ? "#F0F4FF" : "white",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                    📅 {new Date(v.visit_date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                  <div>
                    <StatusPill status={v.status} />
                  </div>
                  <div>
                    <ScoreBadge score={v.par_score} />
                  </div>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    {v.scan_count} scan{v.scan_count !== 1 ? "s" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: "#6366F1",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      textAlign: "center",
                    }}
                  >
                    ›
                  </div>
                </div>

                {/* Expanded score breakdown */}
                {isOpen && v.score_details && (
                  <div
                    style={{
                      background: "#FAFBFD",
                      borderTop: "1px solid #E2E8F0",
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        letterSpacing: "0.06em",
                        marginBottom: 12,
                      }}
                    >
                      PAR Score Breakdown
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                      {[
                        ["Upper Anterior", v.score_details.upper_anterior_score],
                        ["Lower Anterior", v.score_details.lower_anterior_score],
                        ["Buccal A-P", v.score_details.buccal_occlusion_antero_posterior_score],
                        ["Buccal Transverse", v.score_details.buccal_occlusion_transverse_score],
                        ["Buccal Vertical", v.score_details.buccal_occlusion_vertical_score],
                        ["Overjet", v.score_details.overjet_score],
                        ["Overbite", v.score_details.overbite_score],
                        ["Centreline", v.score_details.centreline_score],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          style={{
                            background: "white",
                            border: "1px solid #E2E8F0",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {v.notes && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 14px",
                          background: "#EEF2FF",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#4338CA",
                        }}
                      >
                        📝 {v.notes}
                      </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>
                      Model version: {v.score_details.model_version || "Manual"} &nbsp;·&nbsp;
                      Calculated: {new Date(v.score_details.calculated_at).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Expanded but no score */}
                {isOpen && !v.score_details && (
                  <div
                    style={{
                      background: "#FAFBFD",
                      borderTop: "1px solid #E2E8F0",
                      padding: "14px 18px",
                      fontSize: 13,
                      color: C.textMuted,
                    }}
                  >
                    No PAR score recorded for this visit yet.
                    {v.notes && <div style={{ marginTop: 8, color: C.textSub }}>📝 {v.notes}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ReportsPage;