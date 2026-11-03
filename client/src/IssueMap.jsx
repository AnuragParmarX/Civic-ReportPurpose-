import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDORE_CENTER = [22.7196, 75.8577];
function MapViewport({ issues }) {
  const map = useMap();
  const coordinates = useMemo(
    () => issues
      .filter((issue) => Number.isFinite(Number(issue.problemLatitude ?? issue.latitude)) && Number.isFinite(Number(issue.problemLongitude ?? issue.longitude)))
      .map((issue) => [Number(issue.problemLatitude ?? issue.latitude), Number(issue.problemLongitude ?? issue.longitude)]),
    [issues],
  );

  useEffect(() => {
    if (coordinates.length === 1) {
      map.setView(coordinates[0], 14);
    } else if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [35, 35], maxZoom: 14 });
    } else {
      map.setView(INDORE_CENTER, 12);
    }
  }, [map, coordinates]);

  return null;
}

function ResetMapView({ onReset }) {
  const map = useMap();
  return (
    <button type="button" className="secondary-button map-reset-button" onClick={() => {
      map.setView(INDORE_CENTER, 11);
      onReset?.();
    }}>
      Reset map view
    </button>
  );
}

function markerColor(status) {
  if (status === "Resolved") return "#2fa866";
  if (status === "In Progress") return "#3b7be2";
  if (status === "Under Review") return "#8a67d0";
  return "#e5a13e";
}

export default function IssueMap({
  issues,
  onOpenIssue,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  localitySearch,
  onLocalitySearchChange,
  onClearFilters,
}) {
  const [tileError, setTileError] = useState(false);
  const filteredIssues = useMemo(() => {
    const locality = localitySearch.trim().toLowerCase();
    return issues.filter((issue) => (
      (!locality || issue.locality?.toLowerCase().includes(locality))
      && (statusFilter === "All" || issue.status === statusFilter)
      && (categoryFilter === "All" || issue.category === categoryFilter)
      && (priorityFilter === "All" || (issue.priority || "Medium") === priorityFilter)
    ));
  }, [issues, localitySearch, statusFilter, categoryFilter, priorityFilter]);
  const mappedIssues = useMemo(
    () => filteredIssues.filter((issue) => Number.isFinite(Number(issue.problemLatitude ?? issue.latitude)) && Number.isFinite(Number(issue.problemLongitude ?? issue.longitude))),
    [filteredIssues],
  );
  const unmappedCount = filteredIssues.length - mappedIssues.length;

  return (
    <div className="interactive-map">
      <div className="map-toolbar">
        <div className="map-search">
          <span>⌕</span>
          <input
            aria-label="Search map by locality"
            placeholder="Search locality, e.g. Vijay Nagar"
            value={localitySearch}
            onChange={(event) => onLocalitySearchChange(event.target.value)}
          />
        </div>
        <select aria-label="Filter map by status" className="filter-select" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="All">All statuses</option>
          <option>Reported</option>
          <option>Under Review</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
        <select aria-label="Filter map by category" className="filter-select" value={categoryFilter} onChange={(event) => onCategoryFilterChange(event.target.value)}>
          <option value="All">All categories</option>
          <option>Roads &amp; Potholes</option>
          <option>Garbage &amp; Sanitation</option>
          <option>Streetlights</option>
          <option>Drainage &amp; Water</option>
          <option>Public Safety</option>
          <option>Other</option>
        </select>
        <select aria-label="Filter map by priority" className="filter-select" value={priorityFilter} onChange={(event) => onPriorityFilterChange(event.target.value)}>
          <option value="All">All priorities</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <button type="button" className="secondary-button map-clear-button" onClick={onClearFilters}>Clear</button>
      </div>
      <MapContainer
        center={INDORE_CENTER}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <MapViewport issues={mappedIssues} />
        <ResetMapView />
        {mappedIssues.map((issue) => (
          <CircleMarker
            key={issue.id}
            center={[Number(issue.problemLatitude ?? issue.latitude), Number(issue.problemLongitude ?? issue.longitude)]}
            radius={9}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: markerColor(issue.status),
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{issue.title}</strong>
                <span>{issue.category} · {issue.locality}</span>
                {issue.imageReference && <img src={issue.imageReference} alt="" className="map-popup-image" />}
                <span className={`map-popup-status ${issue.status === "Resolved" ? "resolved" : ""}`}>
                  {issue.status}
                </span>
                <span>Priority: {issue.priority || "Medium"} · Votes: {issue.votes ?? issue.voteCount ?? 0}</span>
                <button type="button" onClick={() => onOpenIssue(issue)}>
                  View full report
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {tileError && (
        <p className="map-error" role="alert">
          Map tiles could not be loaded. Reports are still available in the issue list.
        </p>
      )}
      <div className="map-overlay-note">
        {mappedIssues.length} marker{mappedIssues.length === 1 ? "" : "s"} from saved coordinates
        {filteredIssues.length !== issues.length ? ` · ${filteredIssues.length} matching reports` : ""}
        {unmappedCount > 0 ? ` · ${unmappedCount} without GPS` : ""}
      </div>
    </div>
  );
}
