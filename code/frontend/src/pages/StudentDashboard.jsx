import { useState } from "react";
import { C } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an STL file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (note) formData.append("note", note);

      const token = localStorage.getItem("orthopar_token");
      const response = await fetch("http://localhost:8000/api/analysis/student/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Upload failed");
      }

      setSuccess(true);
      setFile(null);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <h2 style={{ margin: "0 0 8px 0", color: C.textDark }}>Upload Anonymized Scan</h2>
        <p style={{ margin: "0 0 24px 0", color: C.textMuted, fontSize: "14px" }}>
          Submit STL files for machine learning training data. Please ensure all personal identifying information has been removed prior to submission.
        </p>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
            ⚠ {error}
          </div>
        )}

        {success && (
          <div style={{ background: "#DCFCE7", color: "#16A34A", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
            ✓ File uploaded successfully! Thank you for your contribution.
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: C.textDark }}>
            STL File
          </label>
          <div 
            style={{ 
              border: `2px dashed ${file ? C.blue : C.border}`, 
              borderRadius: "8px", 
              padding: "40px 20px", 
              textAlign: "center",
              background: file ? C.blueLight : "#F8FAFC",
              cursor: "pointer"
            }}
            onClick={() => document.getElementById('student-file-upload').click()}
          >
            <input 
              id="student-file-upload" 
              type="file" 
              accept=".stl" 
              onChange={handleFileChange} 
              style={{ display: "none" }} 
            />
            {file ? (
              <div style={{ color: C.blue, fontWeight: "600" }}>{file.name}</div>
            ) : (
              <div style={{ color: C.textMuted }}>
                {Icons.upload} <br/>
                <span style={{ display: "inline-block", marginTop: "8px" }}>Click to select STL file</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: C.textDark }}>
            Optional Note
          </label>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any context or details about this scan..."
            style={{ 
              width: "100%", 
              height: "100px", 
              padding: "12px", 
              borderRadius: "8px", 
              border: `1px solid ${C.border}`,
              fontFamily: "inherit",
              resize: "vertical"
            }}
          />
        </div>

        <button 
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{ 
            width: "100%", 
            padding: "14px", 
            background: file ? C.blue : C.textMuted, 
            color: "#fff", 
            border: "none", 
            borderRadius: "8px", 
            fontWeight: "600",
            cursor: file && !uploading ? "pointer" : "not-allowed",
            fontSize: "15px"
          }}
        >
          {uploading ? "Uploading to S3..." : "Submit Scan"}
        </button>
      </div>
    </div>
  );
}
