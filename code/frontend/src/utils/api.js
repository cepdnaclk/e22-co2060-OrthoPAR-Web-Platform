const BASE_URL = "http://localhost:8000";

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

export async function register(email, fullName, password) {
  return request("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName, password }),
  });
}

export function logout() {
  localStorage.removeItem("orthopar_token");
}

export async function getMe() {
  return request("/users/me");
}

// ── Patients ──────────────────────────────────────────────────────────────────

export async function getPatients() {
  return request("/api/analysis/patients");
}

export async function createPatient(name, treatmentStatus) {
  return request("/api/analysis/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, treatment_status: treatmentStatus }),
  });
}

export async function getPatient(patientId) {
  return request(`/api/analysis/patients/${patientId}`);
}

// ── Scans ─────────────────────────────────────────────────────────────────────

export async function uploadScan(patientId, fileType, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${BASE_URL}/api/analysis/scans?patient_id=${patientId}&file_type=${encodeURIComponent(fileType)}`,
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

export async function calculateScore(patientId) {
  return request(`/api/analysis/landmarks/calculate/${patientId}`, { method: "POST" });
}
