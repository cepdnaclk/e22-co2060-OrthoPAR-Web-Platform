import { useState } from "react";
import { login as apiLogin, register as apiRegister, getMe } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { C } from "../utils/constants.js";
import "./AuthPage.css";

export default function AuthPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Clinical Registration Fields
  const [hospitalName, setHospitalName] = useState("");
  const [slmc, setSlmc] = useState("");
  const [specialty, setSpecialty] = useState("Orthodontist");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await apiLogin(email, password);
      const user = await getMe();
      login(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    setLoading(true);
    try {
      await apiRegister(email, fullName, password, hospitalName, slmc, specialty, phone);
      setSuccess("Account created! You can now log in.");
      setTab("login");
      setFullName("");
      setPassword("");
      setHospitalName("");
      setSlmc("");
      setPhone("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div className="auth-wrap">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-mark">🦷</div>
            <div>
              <div className="auth-logo-text">OrthoScan</div>
              <div className="auth-logo-sub">PAR INDEX PLATFORM</div>
            </div>
          </div>

          <div className="auth-title">{tab === "login" ? "Welcome back" : "Create account"}</div>
          <div className="auth-sub">
            {tab === "login"
              ? "Sign in to your clinician account"
              : "Register a new clinician account"}
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); clearMessages(); }}>
              Sign In
            </button>
            <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => { setTab("register"); clearMessages(); }}>
              Register
            </button>
          </div>

          {error && <div className="auth-error">⚠ {error}</div>}
          {success && <div className="auth-success">✓ {success}</div>}

          <form onSubmit={tab === "login" ? handleLogin : handleRegister}>
            {tab === "register" && (
              <>
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <input
                    className={`auth-input${error && !fullName ? " error" : ""}`}
                    type="text"
                    placeholder="Dr. Jane Smith"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    id="auth-fullname"
                  />
                </div>
                
                <div className="auth-field">
                  <label className="auth-label">Hospital/Clinic Name <span style={{color: "#888", fontSize: "0.8em"}}>(Optional)</span></label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="e.g. Asiri Medical"
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">SLMC Registration Number <span style={{color: "#888", fontSize: "0.8em"}}>(Recommended)</span></label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="e.g. SLMC-10933"
                    value={slmc}
                    onChange={e => setSlmc(e.target.value)}
                  />
                </div>

                <div className="auth-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label className="auth-label">Specialty</label>
                        <select 
                            className="auth-input" 
                            value={specialty} 
                            onChange={e => setSpecialty(e.target.value)}
                            style={{ height: '44px', padding: '0 12px' }}
                        >
                            <option value="Orthodontist">Orthodontist</option>
                            <option value="General Dentist">General Dentist</option>
                            <option value="Maxillofacial Surgeon">Maxillofacial Surgeon</option>
                            <option value="Resident/Student">Resident/Student</option>
                        </select>
                    </div>
                    <div>
                        <label className="auth-label">Contact Phone</label>
                        <input
                            className="auth-input"
                            type="tel"
                            placeholder="+94 77 XXXXXXX"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                </div>
              </>
            )}

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="doctor@clinic.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                id="auth-email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                id="auth-password"
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading} id="auth-submit">
              {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="auth-divider">
            By Team Nai Miris
          </div>
        </div>
      </div>
    </>
  );
}