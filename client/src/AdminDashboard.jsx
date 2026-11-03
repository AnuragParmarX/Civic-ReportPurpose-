import { useEffect, useState } from "react";

import {
  flagAdminIssue,
  deleteAdminIssue,
  getAdminIssues,
  getAdminStats,
  updateAdminIssue,
} from "./api";

const statuses = ["Reported", "Under Review", "In Progress", "Resolved"];
const categories = [
  "Roads & Potholes",
  "Garbage & Sanitation",
  "Streetlights",
  "Drainage & Water",
  "Public Safety",
  "Other",
];

function AdminDashboard({ token, onExpired }) {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ total: 0, unresolved: 0, inProgress: 0, resolved: 0 });
  const [categoryStats, setCategoryStats] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "All", category: "All", priority: "All", flagged: "All" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [issuePayload, statsPayload] = await Promise.all([
        getAdminIssues({ token, page, ...filters }),
        getAdminStats(token),
      ]);
      setIssues(issuePayload.data.issues);
      setPagination(issuePayload.pagination);
      setStats(statsPayload.data.summary);
      setCategoryStats(statsPayload.data.categories);
      setError("");
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onExpired(requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const refresh = setTimeout(() => load(), 0);
    return () => clearTimeout(refresh);
    // Admin filters are synchronized with the protected API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  function changeFilter(name, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function saveIssue(issue, updates) {
    setSaving(true);
    setMessage("");
    try {
      const payload = await updateAdminIssue(issue.reportId || issue._id, updates, token);
      const next = payload.data.issue;
      setIssues((current) => current.map((item) => item._id === next._id ? next : item));
      setSelected(next);
      setMessage("Report updated successfully.");
      await load();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onExpired(requestError);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(issue) {
    const flagged = !issue.isFlagged;
    const reason = flagged ? (window.prompt("Flag reason: Suspicious or Potential duplicate", "Suspicious") || "") : undefined;
    if (flagged && !["Suspicious", "Potential duplicate"].includes(reason)) {
      setError("Choose Suspicious or Potential duplicate when flagging a report.");
      return;
    }

    setSaving(true);
    try {
      const payload = await flagAdminIssue(issue.reportId || issue._id, flagged, reason, token);
      setIssues((current) => current.map((item) => item._id === payload.data.issue._id ? payload.data.issue : item));
      setSelected(payload.data.issue);
      setMessage(flagged ? "Report flagged for administrator review." : "Report flag removed.");
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onExpired(requestError);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }

  }

  async function deleteIssue(issue) {
    const confirmed = window.confirm(
      `Delete ${issue.reportId}: ${issue.title}?\n\nThis permanently removes the report and its votes.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      await deleteAdminIssue(issue.reportId || issue._id, token);
      setSelected(null);
      setMessage("Report deleted successfully.");
      await load();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onExpired(requestError);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="welcome-strip">
        <div><span className="eyebrow">ACADEMIC ADMINISTRATOR WORKSPACE</span><h1>Report administration</h1><p>Review and update community submissions. This is a demonstration role, not a municipal office.</p></div>
      </div>
      {message && <p className="success-message" role="status">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="stats-grid admin-stats">
        {[
          ["Total reports", stats.total, "blue"],
          ["Unresolved", stats.unresolved, "orange"],
          ["In progress", stats.inProgress, "purple"],
          ["Resolved", stats.resolved, "green"],
        ].map(([label, value, tone]) => <div className="stat-card" key={label}><div className={`stat-icon ${tone}`}>▦</div><p>{label}</p><h2>{value}</h2><small>Live database count</small></div>)}
      </div>
      <div className="panel analytics-panel admin-category-panel"><h3>Reports by category</h3>{categoryStats.map((item) => <div className="bar-row" key={item.category}><div className="bar-label"><span>{item.category}</span><strong>{item.count}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${stats.total ? (item.count / stats.total) * 100 : 0}%` }} /></div></div>)}</div>
      <section className="panel issues-panel">
        <div className="section-heading"><div><h2>Manage reports</h2><p>Search, filter, inspect, and update saved reports.</p></div></div>
        <div className="table-toolbar admin-toolbar">
          <div className="search-box"><span>⌕</span><input aria-label="Search administrator reports" placeholder="Search reports..." value={filters.search} onChange={(event) => changeFilter("search", event.target.value)} /></div>
          <select className="filter-select" value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <select className="filter-select" value={filters.category} onChange={(event) => changeFilter("category", event.target.value)}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <select className="filter-select" value={filters.priority} onChange={(event) => changeFilter("priority", event.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option></select>
          <select className="filter-select" value={filters.flagged} onChange={(event) => changeFilter("flagged", event.target.value)}><option>All</option><option value="true">Flagged</option></select>
        </div>
        {loading ? <div className="empty-state"><span>⌛</span><h3>Loading administrator reports...</h3></div> : issues.length === 0 ? <div className="empty-state"><span>🔎</span><h3>No matching reports</h3><p>Try changing the administrator filters.</p></div> : <div className="issue-list">{issues.map((issue) => <article className="issue-row admin-issue-row" key={issue._id} onClick={() => setSelected(issue)}><div className="issue-icon blue">📍</div><div className="issue-details"><h3>{issue.reportId}: {issue.title}</h3><p>{issue.category} · {issue.locality}, {issue.city} · Priority: {issue.priority}</p></div>{issue.isFlagged && <span className="flag-badge">⚑ {issue.flagReason}</span>}<span className={`status-badge ${issue.status === "Resolved" ? "resolved" : issue.status === "In Progress" ? "progress" : issue.status === "Under Review" ? "review" : "reported"}`}><span className="status-dot" />{issue.status}</span><button className="text-button" onClick={(event) => { event.stopPropagation(); setSelected(issue); }}>Inspect</button></article>)}</div>}
        <div className="panel-footer"><span>{pagination.total || 0} matching reports</span><div className="pagination-controls"><button className="text-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Previous</button><span>Page {page} of {pagination.pages || 1}</span><button className="text-button" disabled={page >= (pagination.pages || 1)} onClick={() => setPage((value) => value + 1)}>Next →</button></div></div>
      </section>
      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="issue-detail-modal admin-detail-modal" onClick={(event) => event.stopPropagation()}><button className="close-button modal-close" onClick={() => setSelected(null)} aria-label="Close details">×</button>{selected.imageReference && <img className="detail-image" src={selected.imageReference} alt={`Evidence for ${selected.title}`} />}<span className="eyebrow">REPORT {selected.reportId}</span><h2>{selected.title}</h2><p className="detail-location">{selected.category} · {selected.locality}, {selected.city}</p><p className="detail-description">{selected.description || "No description was provided."}</p>{selected.latitude != null && <p className="detail-meta">Coordinates: {selected.latitude}, {selected.longitude}</p>}<p className="detail-meta">Votes: {selected.voteCount} · Submitted by: {selected.creator?.name || "Unknown"}</p><div className="admin-edit-grid"><label>Status<select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Priority<select value={selected.priority} onChange={(event) => setSelected({ ...selected, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label></div><label className="admin-notes">Resolution notes<textarea maxLength={500} rows={4} value={selected.resolutionNotes || ""} onChange={(event) => setSelected({ ...selected, resolutionNotes: event.target.value })} /></label><div className="detail-actions admin-actions"><button className="primary-button" disabled={saving} onClick={() => saveIssue(selected, { status: selected.status, priority: selected.priority, resolutionNotes: selected.resolutionNotes || "" })}>{saving ? "Saving..." : "Save changes"}</button><button className="secondary-button" disabled={saving} onClick={() => toggleFlag(selected)}>{selected.isFlagged ? "Remove flag" : "Flag report"}</button><button className="danger-button" disabled={saving} onClick={() => deleteIssue(selected)}>Delete report</button></div>{selected.isFlagged && <p className="flag-note">Flagged as {selected.flagReason} by {selected.flaggedBy?.name || "administrator"} on {selected.flaggedAt ? new Date(selected.flaggedAt).toLocaleString() : "unknown date"}.</p>}<div className="status-history"><h3>Status history</h3>{(selected.statusHistory || []).length === 0 ? <p className="detail-meta">No administrator status changes recorded.</p> : selected.statusHistory.slice().reverse().map((entry) => <p className="detail-meta" key={`${entry.changedAt}-${entry.status}`}><strong>{entry.status}</strong> · {entry.changedBy?.name || "Administrator"} · {new Date(entry.changedAt).toLocaleString()}{entry.resolutionNotes ? ` · ${entry.resolutionNotes}` : ""}</p>)}</div></section></div>}
    </section>
  );
}

export default AdminDashboard;
