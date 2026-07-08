const BASE_URL = "";

function getToken() {
  return localStorage.getItem("orthopar_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    let detail = "Login failed";
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }

  const data = await res.json();
  localStorage.setItem("orthopar_token", data.access_token);
  return data;
}

export async function register(email, fullName, password, hospitalName, slmcRegistrationNumber, specialty, phoneNumber) {
  return request("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      email, 
      full_name: fullName, 
      password,
      hospital_name: hospitalName || null,
      slmc_registration_number: slmcRegistrationNumber || null,
      specialty: specialty || null,
      phone_number: phoneNumber || null
    }),
  });
}

export function logout() {
  localStorage.removeItem("orthopar_token");
}

export async function getMe() {
  return request("/users/me");
}

export async function updateProfile(data) {
  return request("/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updatePassword(current_password, new_password) {
  return request("/users/me/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password, new_password }),
  });
}

// ── Patients ──────────────────────────────────────────────────────────────────

export async function getPatients() {
  return request("/api/analysis/patients");
}

export async function createPatient(name, treatmentStatus, hospitalPatientId, dateOfBirth, gender) {
  return request("/api/analysis/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      name, 
      treatment_status: treatmentStatus,
      hospital_patient_id: hospitalPatientId || null,
      date_of_birth: dateOfBirth || null,
      gender: gender || null
    }),
  });
}

export async function getPatient(patientId) {
  return request(`/api/analysis/patients/${patientId}`);
}

// ── Visits ────────────────────────────────────────────────────────────────────

export async function createVisit(patientId, notes = "", status = "Pre-Treatment") {
  return request("/api/analysis/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_id: patientId, notes, status }),
  });
}

// ── Scans ─────────────────────────────────────────────────────────────────────

export async function uploadScan(visitId, fileType, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${BASE_URL}/api/analysis/scans?visit_id=${visitId}&file_type=${encodeURIComponent(fileType)}`,

    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  if (!res.ok) {
    let detail = "Upload failed";
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ── ML Pipeline ───────────────────────────────────────────────────────────────

export async function extractLandmarks(scanId) {
  return request(`/api/analysis/landmarks/extract/${scanId}`, { method: "POST" });
}

export async function calculateScore(visitId) {
  return request(`/api/analysis/landmarks/calculate/${visitId}`, { method: "POST" });
}

export async function saveManualScore(visitId, scoreData) {
  return request(`/api/analysis/scores/manual/${visitId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scoreData),
  });
}

export async function getReports() {
  return request("/api/analysis/reports");
}

export async function getPatientReport(patientId) {
  return request(`/api/analysis/patients/${patientId}/report`);
}

export async function getAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.action) query.append("action", params.action);
  if (params.from_date) query.append("from_date", params.from_date);
  if (params.to_date) query.append("to_date", params.to_date);
  if (params.skip !== undefined) query.append("skip", params.skip);
  if (params.limit !== undefined) query.append("limit", params.limit);
  
  return request(`/api/analysis/audit-logs?${query.toString()}`);
}

// ── Model Management ──────────────────────────────────────────────────────────

export async function getActiveMLModel() {
  return request("/api/ml-models/active");
}

export async function getMLModels() {
  return request("/api/ml-models");
}

export async function uploadMLModel(name, version, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("name", name);
  formData.append("version", version);
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/ml-models/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    let detail = "Model upload failed";
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function activateMLModel(modelId) {
  return request(`/api/ml-models/${modelId}/activate`, { method: "PUT" });
}

