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
      await apiRegister(email, fullName, password);
      setSuccess("Account created! You can now log in.");
      setTab("login");
      setFullName("");
      setPassword("");
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