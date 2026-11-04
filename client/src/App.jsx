import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  authenticate,
  createIssue,
  getCurrentUser,
  getIssue,
  getIssues,
  logout as logoutRequest,
  updateVote,
  uploadIssuePhoto,
} from "./api";
import AdminDashboard from "./AdminDashboard";
import IssueMap from "./IssueMap";
import LocationPicker from "./LocationPicker";

const TOKEN_KEY = "civicconnect_token";
const categories = [
  "Roads & Potholes",
  "Garbage & Sanitation",
  "Streetlights",
  "Drainage & Water",
  "Public Safety",
  "Other",
];

function normalizeIssue(issue) {
  const problemLatitude = issue.problemLatitude ?? issue.latitude;
  const problemLongitude = issue.problemLongitude ?? issue.longitude;
  return {
    ...issue,
    latitude: problemLatitude,
    longitude: problemLongitude,
    id: issue._id || issue.reportId,
    location: `${issue.locality}${issue.city ? `, ${issue.city}` : ""}`,
    votes: issue.voteCount ?? 0,
    hasVoted: Boolean(issue.hasVoted),
    icon: "📍",
    color: "blue",
  };
}

function App() {
  const [issues, setIssues] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [apiError, setApiError] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  const [mapPriorityFilter, setMapPriorityFilter] = useState("All");
  const [mapLocalitySearch, setMapLocalitySearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: categories[0],
    location: "",
    description: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("");
  const [problemCoords, setProblemCoords] = useState(null);
  const [problemLocationMessage, setProblemLocationMessage] = useState("");
  const [problemLocationConfirmed, setProblemLocationConfirmed] = useState(false);
  const hasValidGpsCoords = Number.isFinite(gpsCoords?.latitude)
    && Number.isFinite(gpsCoords?.longitude)
    && gpsCoords.latitude >= -90
    && gpsCoords.latitude <= 90
    && gpsCoords.longitude >= -180
    && gpsCoords.longitude <= 180;

  function handleExpiredSession() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setAuthError("Your session expired. Please log in again.");
  }

  async function loadIssues() {
    setLoading(true);
    try {
      const payload = await getIssues({
        token,
        search,
        status: statusFilter,
        category: categoryFilter,
      });
      setIssues(payload.data.issues.map(normalizeIssue));
      setApiError("");
    } catch (error) {
      if (error.status === 401) handleExpiredSession();
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function restoreSession() {
      if (token) {
        try {
          const payload = await getCurrentUser(token);
          setCurrentUser(payload.data.user);
          setActiveNav(payload.data.user.role === "admin" ? "Administrator" : "Overview");
        } catch (error) {
          handleExpiredSession();
          setAuthError(error.status === 401 ? "Your session expired. Please log in again." : error.message);
        }
      }
      await loadIssues();
    }

    restoreSession();
    // The persisted token is intentionally read once during application startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;
    const refresh = setTimeout(() => loadIssues(), 0);
    return () => clearTimeout(refresh);
    // Search and filters are backed by the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, categoryFilter]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const payload = await authenticate(authMode, authForm);
      localStorage.setItem(TOKEN_KEY, payload.data.token);
      setToken(payload.data.token);
      setCurrentUser(payload.data.user);
      setActiveNav(payload.data.user.role === "admin" ? "Administrator" : "Overview");
      setAuthForm({ name: "", email: "", password: "" });
      setApiError("");
      await loadIssues();
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    if (token) await logoutRequest(token).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setIssues([]);
    setShowForm(false);
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size must be 5 MB or less.");
      event.target.value = "";
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError("");
  }

  function getCurrentLocation() {
    setGpsCoords(null);
    if (!navigator.geolocation) {
      setGpsMessage("Location is unavailable in this browser. Please try another browser or device.");
      return;
    }
    setGpsMessage("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (
          !Number.isFinite(coords.latitude)
          || !Number.isFinite(coords.longitude)
          || coords.latitude < -90
          || coords.latitude > 90
          || coords.longitude < -180
          || coords.longitude > 180
        ) {
          setGpsMessage("The device returned an invalid location. Please try again.");
          return;
        }
        setGpsCoords(coords);
        setGpsMessage(`Location captured: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      },
      (error) => setGpsMessage(
        error.code === 1
          ? "Location permission denied. Please allow location access and try again."
          : "Unable to get your location. Please check GPS and try again.",
      ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function submitIssue(event) {
    event.preventDefault();
    if (!hasValidGpsCoords || !problemCoords || !problemLocationConfirmed) {
      setProblemLocationMessage(!hasValidGpsCoords
        ? "Please capture your reporter location before submitting."
        : !problemCoords
          ? "Please select the problem location on the map before submitting."
          : "Please confirm the problem location before submitting.");
      if (!hasValidGpsCoords) {
        setGpsMessage("Please use your current location before submitting the report.");
      }
      return;
    }
    setSubmitting(true);
    setApiError("");
    try {
      let imageReference = null;
      if (photoFile) {
        const upload = await uploadIssuePhoto(photoFile, token);
        imageReference = upload.data.imageReference;
      }
      const issuePayload = {
        title: form.title.trim(),
        category: form.category,
        locality: form.location.trim(),
        description: form.description.trim(),
        imageReference,
        reporterLatitude: gpsCoords.latitude,
        reporterLongitude: gpsCoords.longitude,
        problemLatitude: problemCoords.latitude,
        problemLongitude: problemCoords.longitude,
        latitude: problemCoords.latitude,
        longitude: problemCoords.longitude,
      };
      await createIssue(issuePayload, token);
      setForm({ title: "", category: categories[0], location: "", description: "" });
      setPhotoFile(null);
      setPhotoPreview("");
      setPhotoError("");
      setGpsCoords(null);
      setGpsMessage("");
      setProblemCoords(null);
      setProblemLocationMessage("");
      setProblemLocationConfirmed(false);
      setShowForm(false);
      setActiveNav("Overview");
    } catch (error) {
      if (error.status === 401) handleExpiredSession();
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }

  }

  async function voteForIssue(issue) {
    if (!token) {
      setAuthError("Please log in as a citizen before voting.");
      return;
    }
    setVotingId(issue.id);
    try {
      const payload = await updateVote(issue.id, issue.hasVoted, token);
      setIssues((current) => current.map((item) => item.id === issue.id
        ? { ...item, votes: payload.data.voteCount, hasVoted: payload.data.hasVoted }
        : item));
      if (selectedIssue?.id === issue.id) {
        setSelectedIssue((item) => ({
          ...item,
          votes: payload.data.voteCount,
          hasVoted: payload.data.hasVoted,
        }));
      }
    } catch (error) {
      if (error.status === 401) handleExpiredSession();
      setApiError(error.message);
    } finally {
      setVotingId(null);
    }
  }

  async function openIssue(issue) {
    try {
      const payload = await getIssue(issue.id, token);
      setSelectedIssue(normalizeIssue(payload.data.issue));
    } catch (error) {
      if (error.status === 401) handleExpiredSession();
      setApiError(error.message);
    }

  }

  const stats = useMemo(() => [
    { label: "Total Reports", value: issues.length, icon: "📋", tone: "blue", change: "Saved community submissions" },
    { label: "In Progress", value: issues.filter((item) => item.status === "In Progress").length, icon: "🔄", tone: "orange", change: "Being addressed" },
    { label: "Resolved Issues", value: issues.filter((item) => item.status === "Resolved").length, icon: "✅", tone: "green", change: "Marked resolved by administrators" },
    { label: "Community Votes", value: issues.reduce((sum, item) => sum + item.votes, 0), icon: "🙌", tone: "purple", change: "Persistent citizen votes" },
  ], [issues]);

  if (!currentUser) {
    return (
      <div className="auth-screen">
        <div className="auth-layout">
          <section className="auth-intro">
            <div className="brand auth-brand"><span className="brand-mark">C</span><span><strong>CrowdSource</strong><small>CIVIC ENGAGEMENT</small></span></div>
            <span className="auth-kicker">INDORE COMMUNITY PLATFORM</span>
            <h1>Small reports.<br /><em>Real change.</em></h1>
            <p>Help your neighbourhood get the attention it deserves. Report local issues, follow progress, and support priorities that matter to your community.</p>
            <div className="auth-highlights">
              <div><span className="auth-highlight-icon">✓</span><span><strong>Make your voice count</strong><small>Submit issues directly to the community workspace.</small></span></div>
              <div><span className="auth-highlight-icon">◎</span><span><strong>See progress clearly</strong><small>Follow reports from submission to resolution.</small></span></div>
            </div>
            <div className="auth-quote"><span>“</span><p>Better neighbourhoods begin with people who care enough to speak up.</p></div>
          </section>
          <section className="auth-card">
            <div className="auth-card-heading">
              <span className="eyebrow">{authMode === "login" ? "CITIZEN ACCESS" : "JOIN THE COMMUNITY"}</span>
              <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p>{authMode === "login" ? "Sign in to continue to your civic workspace." : "Register as a citizen to start making a difference."}</p>
            </div>
            <form onSubmit={submitAuth} className="auth-form">
              {authMode === "register" && <label>Full name<input required minLength={2} maxLength={80} value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Your name" /></label>}
              <label>Email address<input required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label>
              <label>Password<input required type="password" minLength={8} maxLength={72} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Enter your password" /></label>
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={authLoading}>{authLoading ? "Please wait..." : authMode === "login" ? "Sign in to CivicConnect" : "Create citizen account"}<span>→</span></button>
            </form>
            <div className="auth-divider"><span>SECURE COMMUNITY ACCESS</span></div>
            <button className="text-button auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
              {authMode === "login" ? "New here? Register as a citizen" : "Already have an account? Sign in"}
            </button>
            <small className="auth-footer-note">Your account is protected with secure authentication.</small>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview"><span className="brand-mark">C</span><span><strong>CrowdSource</strong><small>CIVIC ENGAGEMENT</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation">
          {(currentUser.role === "admin"
            ? [["Administrator", "⚙"], ["Community Map", "◎"], ["Analytics", "▥"]]
            : [["Overview", "▦"], ["Issue Reports", "▤"], ["Community Map", "◎"], ["Analytics", "▥"]]
          ).map(([label, icon]) => (
            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setShowForm(false); }}>
              <span className="nav-icon">{icon}</span>{label}{label === "Issue Reports" && <span className="nav-count">{issues.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card"><span className="demo-dot" /><strong>Live Civic Data</strong><p>Reports and votes are stored in CivicConnect.</p></div>
          <div className="profile"><div className="avatar">CS</div><div className="profile-text"><strong>{currentUser.name}</strong><small>{currentUser.role === "admin" ? "Administrator" : "Community member"}</small></div><button className="profile-menu" onClick={logout} title="Log out">↪</button></div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{activeNav}</strong></div><div className="topbar-right"><span className="location-pill"><span>⌖</span> Indore, MP</span><button className="avatar top-avatar" title="Log out" onClick={logout}>CS</button></div></header>
        <div className="page-content">
          {(authError || apiError) && <p className="auth-error page-error" role="alert">{authError || apiError}</p>}
          {currentUser.role === "admin" && (activeNav === "Administrator" || activeNav === "Overview") ? (
            <AdminDashboard token={token} onExpired={handleExpiredSession} />
          ) : activeNav === "Community Map" ? (
            <section className="map-placeholder"><span className="eyebrow">COMMUNITY EXPLORER</span><h1>Community Map</h1><p>Explore saved civic reports across Indore. Reports without GPS coordinates remain available in Issue Reports.</p><IssueMap issues={issues} onOpenIssue={openIssue} statusFilter={mapStatusFilter} onStatusFilterChange={setMapStatusFilter} categoryFilter={mapCategoryFilter} onCategoryFilterChange={setMapCategoryFilter} priorityFilter={mapPriorityFilter} onPriorityFilterChange={setMapPriorityFilter} localitySearch={mapLocalitySearch} onLocalitySearchChange={setMapLocalitySearch} onClearFilters={() => { setMapStatusFilter("All"); setMapCategoryFilter("All"); setMapPriorityFilter("All"); setMapLocalitySearch(""); }} /><p className="map-note"><span className="demo-dot" /> Filters apply together · <span className="map-legend-dot" /> Only reports with saved coordinates are mapped</p></section>
          ) : activeNav === "Analytics" ? (
            <section><span className="eyebrow">COMMUNITY INSIGHTS</span><div className="page-heading"><div><h1>Analytics</h1><p>Calculated from reports currently stored in MongoDB.</p></div></div><div className="stats-grid">{stats.map((stat) => <div className={`stat-card ${stat.tone}`} key={stat.label}><div className={`stat-icon ${stat.tone}`}>{stat.icon}</div><p>{stat.label}</p><h2>{stat.value}</h2><small>{stat.change}</small></div>)}</div><div className="panel analytics-panel"><div className="analytics-panel-heading"><h3>Reports by category</h3><span>{issues.length} total reports</span></div><div className="category-grid">{categories.map((category, index) => { const count = issues.filter((issue) => issue.category === category).length; const percentage = issues.length ? (count / issues.length) * 100 : 0; return <div className={`bar-row category-${index}`} key={category}><div className="bar-label"><span>{category}</span></div><div className="category-count">{count}</div><div className="bar-track"><div className="bar-fill" style={{ width: `${percentage}%` }} /></div></div>; })}</div></div></section>
          ) : (
            <>
              <div className="welcome-strip"><div><span className="eyebrow">CIVIC ENGAGEMENT PLATFORM</span><h1>{activeNav === "Issue Reports" ? "Issue Reports" : "Good morning, Citizen"} <span className="heading-sparkle">{activeNav === "Overview" ? "✳" : ""}</span></h1><p>{activeNav === "Issue Reports" ? "Browse and track community-reported civic issues." : "Together, let's make our neighbourhood better."}</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><span>＋</span> Report an issue</button></div>
              {showForm && <section className="panel report-form-panel"><div className="section-heading"><div><span className="eyebrow">CITIZEN SUBMISSION</span><h2>Report a civic issue</h2></div><button className="close-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div><form onSubmit={submitIssue} className="report-form"><label>Issue title *<input required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Pothole near the bus stop" /></label><label>Category *<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Area / locality *<input required maxLength={100} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Vijay Nagar" /></label><div className="gps-field"><button type="button" className="secondary-button" onClick={getCurrentLocation}>📍 {hasValidGpsCoords ? "Refresh Current Location" : "Use My Current Location"} *</button>{gpsMessage && <p className="gps-message" role="status">{gpsMessage}</p>}<p className="photo-help">Required reporter location. Capture your current GPS location before submitting.</p></div><div className="problem-location-field"><div className="location-field-heading"><strong>Problem Location *</strong></div><LocationPicker coordinates={problemCoords} confirmed={problemLocationConfirmed} onSelect={(coordinates, label) => { setProblemCoords(coordinates); setProblemLocationConfirmed(false); setProblemLocationMessage(label ? `Problem location selected: ${label}` : "Problem location updated. Confirm it before submitting."); }} onConfirm={(confirmed) => { setProblemLocationConfirmed(confirmed); setProblemLocationMessage(confirmed ? "Problem location confirmed." : "Choose the location and confirm it before submitting."); }} />{problemLocationMessage && <p className="gps-message" role="status">{problemLocationMessage}</p>}</div><label>Description<textarea rows={3} maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the issue and its impact..." /></label><div className="photo-upload-field"><label htmlFor="issue-photo">Photo evidence (optional)</label><input id="issue-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoChange} /><p className="photo-help">Maximum size: 5 MB. The image is uploaded to the CivicConnect server.</p>{photoError && <p className="photo-error">{photoError}</p>}{photoPreview && <div className="photo-preview"><img src={photoPreview} alt="Selected civic issue" /><button type="button" className="remove-photo" onClick={() => { setPhotoFile(null); setPhotoPreview(""); setPhotoError(""); }}>Remove photo</button></div>}</div><div className="form-footer"><span>* Required fields</span><button className="primary-button" type="submit" disabled={submitting || !hasValidGpsCoords || !problemCoords || !problemLocationConfirmed}>{submitting ? "Saving..." : "Submit report"} <span>→</span></button></div></form><p className="demo-disclaimer">Reporter and problem coordinates are persisted by CivicConnect. Photos remain optional.</p></section>}
              <section className="stats-grid">{stats.map((stat) => <div className={`stat-card ${stat.tone}`} key={stat.label}><div className="stat-top"><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span><span className="stat-menu">···</span></div><p>{stat.label}</p><h2>{stat.value}</h2><small>{stat.change}</small></div>)}</section>
              <section className="panel issues-panel"><div className="section-heading"><div><h2>{activeNav === "Issue Reports" ? "All issue reports" : "Recent issue reports"}</h2><p>Track what needs attention in your community.</p></div><button className="text-button" onClick={() => setActiveNav("Issue Reports")}>View all <span>→</span></button></div><div className="table-toolbar"><div className="search-box"><span>⌕</span><input aria-label="Search reports" placeholder="Search reports..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Reported</option><option>In Progress</option><option>Resolved</option></select><select className="filter-select" aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="issue-list">{loading ? <div className="empty-state"><span>⌛</span><h3>Loading reports...</h3><p>Retrieving saved reports from CivicConnect.</p></div> : issues.length === 0 ? <div className="empty-state"><span>🔎</span><h3>No reports found</h3><p>Try different filters or submit the first report.</p></div> : issues.map((issue) => <article className="issue-row" key={issue.id} onClick={() => openIssue(issue)}><div className={`issue-icon ${issue.color}`}>{issue.icon}</div><div className="issue-details"><h3>{issue.title}</h3><p>{issue.category} <span>·</span> {issue.location}</p></div><span className={`status-badge ${issue.status === "Resolved" ? "resolved" : issue.status === "In Progress" ? "progress" : "reported"}`}><span className="status-dot" />{issue.status}</span><button className={`vote-button ${issue.hasVoted ? "voted" : ""}`} onClick={(event) => { event.stopPropagation(); voteForIssue(issue); }} disabled={votingId === issue.id} title={issue.hasVoted ? "Remove your vote" : "Support this issue"}><span>{issue.hasVoted ? "✓" : "▲"}</span> {issue.votes}</button></article>)}</div><div className="panel-footer">Showing {issues.length} saved reports<span>One active vote per citizen per report</span></div></section>
              <footer className="page-footer"><span>© 2026 CrowdSource</span><span>Built for community participation in Indore, MP</span></footer>
            </>
          )}
        </div>
      </main>
      {selectedIssue && <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}><section className="issue-detail-modal" onClick={(event) => event.stopPropagation()}><button className="close-button modal-close" onClick={() => setSelectedIssue(null)} aria-label="Close details">×</button>{selectedIssue.imageReference && <img className="detail-image" src={selectedIssue.imageReference} alt={`Evidence for ${selectedIssue.title}`} />}<span className="eyebrow">REPORT {selectedIssue.reportId}</span><h2>{selectedIssue.title}</h2><p className="detail-location">{selectedIssue.category} · {selectedIssue.location}</p><span className={`status-badge ${selectedIssue.status === "Resolved" ? "resolved" : selectedIssue.status === "In Progress" ? "progress" : "reported"}`}><span className="status-dot" />{selectedIssue.status}</span><p className="detail-description">{selectedIssue.description || "No description was provided."}</p><p className="detail-meta">Priority: {selectedIssue.priority || "Medium"}{selectedIssue.creator?.name ? ` · Reported by ${selectedIssue.creator.name}` : ""}</p>{selectedIssue.resolutionNotes && <p className="detail-meta">Resolution notes: {selectedIssue.resolutionNotes}</p>}{selectedIssue.latitude != null && <p className="detail-meta">Problem coordinates: {selectedIssue.latitude}, {selectedIssue.longitude}</p>}{selectedIssue.reporterLatitude != null && <p className="detail-meta">Reporter coordinates: {selectedIssue.reporterLatitude}, {selectedIssue.reporterLongitude}</p>}<div className="detail-actions"><button className={`vote-button ${selectedIssue.hasVoted ? "voted" : ""}`} onClick={() => voteForIssue(selectedIssue)} disabled={votingId === selectedIssue.id}>{selectedIssue.hasVoted ? "✓ Remove vote" : "▲ Vote"} · {selectedIssue.votes}</button></div></section></div>}
    </div>
  );
}

export default App;
