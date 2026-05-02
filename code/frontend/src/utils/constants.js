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

// ─── Metric → STL Visibility Map ─────────────────────────────────────────────
// Defines which jaw STL(s) must be visible when manually measuring each metric
export const METRIC_STL_MAP = {
  upperCrowding:   { upper: true,  lower: false, buccal: false },
  lowerCrowding:   { upper: false, lower: true,  buccal: false },
  overjet:         { upper: true,  lower: false, buccal: true  },
  overbite:        { upper: true,  lower: true,  buccal: false },
  midlineShift:    { upper: true,  lower: true,  buccal: false },
  buccalOcclusion: { upper: true,  lower: true,  buccal: false },
};

// ─── Guided Measurement Steps ─────────────────────────────────────────────────
// Each metric has an ordered list of clicks. Each step specifies:
//   prompt  → instruction shown to the clinician for that specific click
//   stl     → which jaw(s) to display for that specific click
// null = metric cannot be measured with a 2-point click; enter score directly.
export const MEASURE_STEPS = {
  upperCrowding: [
    { prompt: "Step 1/2 — Click a contact point on the Upper arch (e.g. R3M, R2D, R1M, L1M…)", stl: { upper: true, lower: false, buccal: false } },
    { prompt: "Step 2/2 — Click its adjacent contact point on the Upper arch", stl: { upper: true, lower: false, buccal: false } },
  ],
  lowerCrowding: [
    { prompt: "Step 1/2 — Click a contact point on the Lower arch (e.g. R3M, R2D, R1M, L1M…)", stl: { upper: false, lower: true, buccal: false } },
    { prompt: "Step 2/2 — Click its adjacent contact point on the Lower arch", stl: { upper: false, lower: true, buccal: false } },
  ],
  overjet: [
    { prompt: "Step 1/2 — Click the incisal tip of the Upper Right Central Incisor (R1Mid) on the Upper Jaw", stl: { upper: true, lower: false, buccal: false } },
    { prompt: "Step 2/2 — Click the labial surface of the Lower Incisor (LCover) on the Buccal scan", stl: { upper: false, lower: false, buccal: true } },
  ],
  overbite: [
    { prompt: "Step 1/2 — Click the incisal tip of the Upper Right Central Incisor (R1Mid) on the Upper Jaw", stl: { upper: true, lower: false, buccal: false } },
    { prompt: "Step 2/2 — Click the incisal tip of the Lower Right Central Incisor (R1Mid) on the Lower Jaw", stl: { upper: false, lower: true, buccal: false } },
  ],
  midlineShift: [
    { prompt: "Step 1/2 — Click the Upper dental midline point (between R1M and L1M) on the Upper Jaw", stl: { upper: true, lower: false, buccal: false } },
    { prompt: "Step 2/2 — Click the Lower dental midline point (between R1M and L1M) on the Lower Jaw", stl: { upper: false, lower: true, buccal: false } },
  ],
  buccalOcclusion: null, // Composite score — enter 0–4 directly in the input field.
};

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