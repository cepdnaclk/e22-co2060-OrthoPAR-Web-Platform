// ─── PAR Scoring Logic ────────────────────────────────────────────────────────
export const PAR_WEIGHTS = {
  overjet: { label: "Overjet", unit: "mm", weight: 6 },
  overbite: { label: "Overbite", unit: "mm", weight: 2 },
  midlineShift: { label: "Midline Shift", unit: "mm", weight: 4 },
  upperCrowding: { label: "Upper Crowding", unit: "mm", weight: 1 },
  lowerCrowding: { label: "Lower Crowding", unit: "mm", weight: 1 },
  buccalOcclusion: { label: "Buccal Occlusion", unit: "score", weight: 3 },
};

export function calcPARPoints(metric, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return 0;
  switch (metric) {
    case "overjet":
      if (v <= 0) return 0;
      if (v <= 3) return 0;
      if (v <= 5) return 1;
      if (v <= 7) return 2;
      if (v <= 9) return 3;
      return 4;
    case "overbite":
      if (v <= 0) return 0;
      if (v <= 3) return 0;
      if (v <= 5) return 1;
      if (v <= 7) return 2;
      return 3;
    case "midlineShift":
      if (v < 2) return 0;
      if (v <= 4) return 1;
      if (v <= 6) return 2;
      return 3;
    case "upperCrowding":
    case "lowerCrowding":
      if (v < 1) return 0;
      if (v <= 2) return 1;
      if (v <= 4) return 2;
      if (v <= 8) return 3;
      return 4;
    case "buccalOcclusion":
      return Math.min(4, Math.round(v));
    default:
      return 0;
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
export const MOCK_PATIENTS = [
  { id: "PT-2041", date: "2025-02-14", score: 28, status: "Critical" },
  { id: "PT-2039", date: "2025-02-13", score: 12, status: "Moderate" },
  { id: "PT-2036", date: "2025-02-11", score: 6, status: "Normal" },
  { id: "PT-2033", date: "2025-02-09", score: 19, status: "Moderate" },
  { id: "PT-2029", date: "2025-02-07", score: 3, status: "Normal" },
];

export const MOCK_AI_VALUES = {
  overjet: "3.2",
  overbite: "4.1",
  midlineShift: "1.8",
  upperCrowding: "3.5",
  lowerCrowding: "2.1",
  buccalOcclusion: "1.0",
};

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const C = {
  bg: "#F4F7FB",
  sidebar: "#FFFFFF",
  white: "#FFFFFF",
  blue: "#0077B6",
  blueDark: "#005A8E",
  blueLight: "#E8F4FD",
  text: "#1A2332",
  textSub: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  red: "#EF4444",
  redLight: "#FEF2F2",
  green: "#10B981",
  greenLight: "#ECFDF5",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  critical: "#DC2626",
  moderate: "#D97706",
  normal: "#059669",
};

export const STATUS_COLORS = {
  Critical: { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
  Moderate: { bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B" },
  Normal: { bg: "#ECFDF5", text: "#059669", dot: "#10B981" },
};

export function getScoreStatus(score) {
  if (score >= 22) return "Critical";
  if (score >= 11) return "Moderate";
  return "Normal";
}