const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error?.message || "The request could not be completed.");
    error.status = response.status;
    error.details = payload.error?.details;
    throw error;
  }

  return payload;
}

export function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return request(path, { ...options, headers });
}

export function getIssues({ token, search, status, category } = {}) {
  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  if (status && status !== "All") params.set("status", status);
  if (category && category !== "All") params.set("category", category);
  const query = params.toString();
  return apiRequest(`/issues${query ? `?${query}` : ""}`, { token });
}

export function getIssue(id, token) {
  return apiRequest(`/issues/${encodeURIComponent(id)}`, { token });
}

export function authenticate(mode, form) {
  return apiRequest(`/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
}

export function getCurrentUser(token) {
  return apiRequest("/auth/me", { token });
}

export function logout(token) {
  return apiRequest("/auth/logout", { method: "POST", token });
}

export function uploadIssuePhoto(file, token) {
  const body = new FormData();
  body.append("image", file);
  return apiRequest("/uploads/issue-image", { method: "POST", body, token });
}

export function createIssue(issue, token) {
  return apiRequest("/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(issue),
    token,
  });
}

export function updateVote(id, hasVoted, token) {
  return apiRequest(`/issues/${encodeURIComponent(id)}/vote`, {
    method: hasVoted ? "DELETE" : "POST",
    token,
  });
}

export function getAdminStats(token) {
  return apiRequest("/admin/stats", { token });
}

export function getAdminIssues({ token, page = 1, search, status, category, priority, flagged } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: "10" });
  if (search) params.set("search", search);
  if (status && status !== "All") params.set("status", status);
  if (category && category !== "All") params.set("category", category);
  if (priority && priority !== "All") params.set("priority", priority);
  if (flagged && flagged !== "All") params.set("flagged", flagged);
  return apiRequest(`/admin/issues?${params.toString()}`, { token });
}

export function updateAdminIssue(id, updates, token) {
  return apiRequest(`/admin/issues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    token,
  });
}

export function deleteAdminIssue(id, token) {
  return apiRequest(`/admin/issues/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}

export function flagAdminIssue(id, flagged, reason, token) {
  return apiRequest(`/admin/issues/${encodeURIComponent(id)}/flag`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flagged, reason }),
    token,
  });
}
