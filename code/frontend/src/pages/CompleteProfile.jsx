import { useState } from "react";
import { updateProfile } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthPage.css"; // Reuse auth page styling

export default function CompleteProfile({ onComplete }) {
  const { user, login } = useAuth();
  
  // Initialize with what we have from Google
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [hospitalName, setHospitalName] = useState(user?.hospital_name || "");
  const [slmc, setSlmc] = useState(user?.slmc_registration_number || "");
  const [specialty, setSpecialty] = useState(user?.specialty || "Orthodontist");
  const [phone, setPhone] = useState(user?.phone_number || "");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Call profile update API
      const updatedUser = await updateProfile({
        full_name: fullName,
        hospital_name: hospitalName,
        slmc_registration_number: slmc,
        specialty: specialty,
        phone_number: phone
      });
      
      // Update local context
      login({ ...user, ...updatedUser });
      
      // Callback to navigate away
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-mark">🦷</div>
            <div>
              <div className="auth-logo-text">OrthoScan</div>
              <div className="auth-logo-sub">PROFILE COMPLETION</div>
            </div>
          </div>

          <div className="auth-title">Complete your profile</div>
          <div className="auth-sub">
            Please provide clinical details to continue
          </div>

          {error && <div className="auth-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Dr. Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            
            <div className="auth-field">
              <label className="auth-label">Hospital/Clinic Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. Asiri Medical"
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">SLMC Registration Number</label>
              <input
                className="auth-input"
                type="text"
                placeholder="e.g. SLMC-10933"
                value={slmc}
                onChange={e => setSlmc(e.target.value)}
                required
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

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
