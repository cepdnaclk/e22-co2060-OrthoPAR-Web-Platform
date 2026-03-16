import { C } from "../utils/constants.js";

function AuthPage() {
  return (
    <div className="content fade-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ textAlign: "center", color: C.textMuted }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
          Authentication
        </div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Please log in to continue.</div>
      </div>
    </div>
  );
}

export default AuthPage;