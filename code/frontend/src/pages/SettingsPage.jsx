import { useState } from "react";
import { C } from "../utils/constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { updateProfile, updatePassword } from "../utils/api.js";

function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [hospital, setHospital] = useState(user?.hospital_name || "");
  const [specialty, setSpecialty] = useState(user?.specialty || "");
  const [slmc, setSlmc] = useState(user?.slmc_registration_number || "");
  const [phone, setPhone] = useState(user?.phone_number || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMsg({ text: "", type: "" });
    try {
      const updated = await updateProfile({
        full_name: fullName,
        hospital_name: hospital,
        specialty,
        slmc_registration_number: slmc,
        phone_number: phone
      });
      updateUser(updated);
      setProfileMsg({ text: "Profile updated successfully!", type: "success" });
      setTimeout(() => setProfileMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setProfileMsg({ text: err.message, type: "error" });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoadingPassword(true);
    setPasswordMsg({ text: "", type: "" });
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordMsg({ text: "Password updated successfully!", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setPasswordMsg({ text: err.message, type: "error" });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="content fade-in" style={{ padding: "40px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        
        {/* Profile Settings */}
        <div style={{ background: "white", padding: 28, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, color: C.text }}>Profile Information</h2>
          <form onSubmit={handleProfileSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Email Address (Read Only)</label>
              <input value={user?.email || ""} disabled style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#F1F5F9", color: C.textMuted }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Full Name</label>
              <input required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Hospital / Clinic</label>
                <input value={hospital} onChange={e => setHospital(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Specialty</label>
                <input value={specialty} onChange={e => setSpecialty(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>SLMC Registration No.</label>
                <input value={slmc} onChange={e => setSlmc(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
              </div>
            </div>

            {profileMsg.text && (
              <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 13, background: profileMsg.type === "success" ? C.greenLight : "#FEE2E2", color: profileMsg.type === "success" ? C.green : C.red }}>
                {profileMsg.text}
              </div>
            )}

            <button type="submit" disabled={loadingProfile} className="btn-primary" style={{ width: "auto", padding: "10px 24px" }}>
              {loadingProfile ? "Saving..." : "Save Profile Changes"}
            </button>
          </form>
        </div>

        {/* Security Settings */}
        <div style={{ background: "white", padding: 28, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: 18, color: C.text }}>Change Password</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>Current Password</label>
              <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textSub }}>New Password</label>
              <input type="password" required minLength="6" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, outline: "none" }} />
            </div>

            {passwordMsg.text && (
              <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, fontSize: 13, background: passwordMsg.type === "success" ? C.greenLight : "#FEE2E2", color: passwordMsg.type === "success" ? C.green : C.red }}>
                {passwordMsg.text}
              </div>
            )}

            <button type="submit" disabled={loadingPassword || !currentPassword || !newPassword} className="btn-primary" style={{ width: "auto", padding: "10px 24px" }}>
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default SettingsPage;