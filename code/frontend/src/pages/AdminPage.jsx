import React, { useState, useEffect } from 'react';
import { getMLModels, uploadMLModel, activateMLModel } from '../utils/api';
import { Icons } from '../utils/components';
import { C } from '../utils/constants';

export default function AdminPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [uploadName, setUploadName] = useState('');
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [confirmActivate, setConfirmActivate] = useState(null); // { id, version }
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const data = await getMLModels();
      setModels(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadName || !uploadVersion || !uploadFile) return;
    
    setUploading(true);
    setUploadError('');
    setUploadMessage('');
    
    try {
      await uploadMLModel(uploadName, uploadVersion, uploadFile);
      setUploadMessage('Model uploaded successfully');
      setUploadName('');
      setUploadVersion('');
      setUploadFile(null);
      // reset file input
      document.getElementById('model-upload-file').value = '';
      fetchModels();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async () => {
    if (!confirmActivate) return;
    setActivating(true);
    setActivateError('');
    try {
      await activateMLModel(confirmActivate.id);
      setConfirmActivate(null);
      fetchModels(); // refresh list to see new active status
    } catch (err) {
      setActivateError(err.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: C.textMuted }}>Loading models...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: C.red, fontWeight: 600 }}>Access Denied or Error</div>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
      
      {/* Upload Section */}
      <section style={{ background: "white", padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0", color: C.textDark }}>Upload New Model</h2>
        <form onSubmit={handleUpload} style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Model Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Production PAR Net" 
              value={uploadName} 
              onChange={e => setUploadName(e.target.value)} 
              required 
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Version</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. v2.0.0" 
              value={uploadVersion} 
              onChange={e => setUploadVersion(e.target.value)} 
              required 
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Model Package (.zip)</label>
            <input 
              id="model-upload-file"
              type="file" 
              accept=".zip" 
              onChange={e => setUploadFile(e.target.files[0])} 
              style={{ fontSize: 14 }}
              required 
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={uploading || !uploadFile}
            style={{ height: 42 }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {uploadError && <div style={{ marginTop: 12, color: C.red, fontSize: 13 }}>{uploadError}</div>}
        {uploadMessage && <div style={{ marginTop: 12, color: C.green, fontSize: 13 }}>{uploadMessage}</div>}
      </section>

      {/* History Section */}
      <section style={{ background: "white", padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0", color: C.textDark }}>Model History</h2>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#F8FAFC", borderBottom: `1px solid ${C.border}` }}>
              <tr>
                <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.textMuted }}>VERSION</th>
                <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.textMuted }}>NAME</th>
                <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.textMuted }}>UPLOADED</th>
                <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.textMuted }}>STATUS</th>
                <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.textMuted, textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: C.textDark }}>{m.version}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: C.text }}>{m.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14, color: C.textMuted }}>{new Date(m.created_at).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {m.is_active ? (
                      <span className="badge badge-green">Active</span>
                    ) : (
                      <span className="badge badge-gray">Inactive</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {!m.is_active && (
                      <button 
                        className="btn" 
                        style={{ padding: "6px 12px", fontSize: 13, border: `1px solid ${C.border}`, background: "white", cursor: "pointer" }}
                        onClick={() => setConfirmActivate({ id: m.id, version: m.version })}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                    No models uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation Modal */}
      {confirmActivate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, width: 400, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: C.textDark }}>Activate Model</h3>
            <p style={{ fontSize: 14, color: C.text, margin: "0 0 20px 0", lineHeight: 1.5 }}>
              This will change PAR scoring for all clinicians globally to <strong>{confirmActivate.version}</strong> immediately. Are you sure you want to proceed?
            </p>
            {activateError && <div style={{ marginBottom: 16, color: C.red, fontSize: 13, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6 }}>{activateError}</div>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button 
                className="btn" 
                style={{ background: "#F1F5F9", color: C.text, border: "none" }}
                onClick={() => { setConfirmActivate(null); setActivateError(''); }}
                disabled={activating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleActivate}
                disabled={activating}
              >
                {activating ? 'Activating...' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
