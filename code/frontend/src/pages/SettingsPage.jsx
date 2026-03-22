import { C } from "../utils/constants.js";

function SettingsPage() {
  return (
    <div className="content fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ textAlign: "center", color: C.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
          Settings
        </div>
        <div style={{ fontSize: 13, marginTop: 4 }}>This module is coming soon.</div>
      </div>
    </div>
  );
}

export default SettingsPage;