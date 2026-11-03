import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const INDORE_CENTER = [22.7196, 75.8577];
const PHOTON_URL = "https://photon.komoot.io/api";
const markerIcon = L.divIcon({
  className: "problem-location-marker",
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function LocationEvents({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }, "Selected map location");
    },
  });
  return null;
}

function MapSelection({ coordinates, onSelect }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.setView([coordinates.latitude, coordinates.longitude], Math.max(map.getZoom(), 15));
    }
  }, [coordinates, map]);

  if (!coordinates) return null;
  return (
    <Marker
      position={[coordinates.latitude, coordinates.longitude]}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const position = event.target.getLatLng();
          onSelect({ latitude: position.lat, longitude: position.lng }, "Adjusted marker location");
        },
      }}
    />
  );
}

export default function LocationPicker({
  coordinates,
  confirmed,
  onSelect,
  onConfirm,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      const currentRequest = ++requestId.current;
      setSearching(true);
      setSearchMessage("");
      try {
        const params = new URLSearchParams({
          q: `${trimmedQuery}, Indore, Madhya Pradesh, India`,
          limit: "5",
          bbox: "75.62,22.52,76.08,22.94",
          lang: "en",
        });
        const response = await fetch(`${PHOTON_URL}?${params}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Location search is temporarily unavailable.");
        const payload = await response.json();
        const results = (payload.features || []).map((feature) => ({
          id: feature.properties.osm_id || feature.properties.name,
          label: [
            feature.properties.name,
            feature.properties.street,
            feature.properties.city || feature.properties.county,
            feature.properties.state,
          ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(", "),
          coordinates: {
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
          },
        }));
        if (currentRequest === requestId.current) {
          setSuggestions(results);
          setSearchMessage(results.length ? "" : "No matching Indore locations found.");
        }
      } catch (error) {
        if (currentRequest === requestId.current) {
          setSuggestions([]);
          setSearchMessage(error.message);
        }
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  function selectSuggestion(result) {
    const nextCoordinates = result.coordinates;
    const label = result.label;
    setSelectedLabel(label);
    setSuggestions([]);
    setSearchMessage("");
    onSelect(nextCoordinates, label);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsMessage("Location is unavailable in this browser. Please choose a location on the map.");
      return;
    }
    setGpsMessage("Getting your problem location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const label = "Your current GPS location";
        setSelectedLabel(label);
        setGpsMessage("Problem location set from your current GPS location.");
        onSelect(nextCoordinates, label);
      },
      (error) => setGpsMessage(
        error.code === 1
          ? "Location permission denied. Please allow access and try again."
          : "Unable to get your location. Please try again or choose it on the map.",
      ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="location-picker">
      <div className="location-search">
        <input
          type="search"
          aria-label="Search problem location"
          placeholder="Search Indore locality, street or landmark"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestions([]);
            setSearchMessage(event.target.value.trim() ? "Type at least 3 characters to search." : "");
            setSelectedLabel("");
            onConfirm(false);
          }}
        />
        <button type="button" className="secondary-button" onClick={useCurrentLocation}>
          Use My Current Location
        </button>
      </div>
      {searching && <p className="location-search-status" role="status">Searching Indore locations...</p>}
      {suggestions.length > 0 && (
        <div className="location-suggestions" role="listbox">
          {suggestions.map((result) => (
            <button type="button" key={result.id} onClick={() => selectSuggestion(result)} role="option">
              {result.label}
            </button>
          ))}
        </div>
      )}
      {searchMessage && <p className="location-search-status" role="status">{searchMessage}</p>}
      <MapContainer center={INDORE_CENTER} zoom={12} scrollWheelZoom className="location-picker-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationEvents onSelect={(nextCoordinates, label) => {
          setSelectedLabel(label);
          onSelect(nextCoordinates, label);
        }} />
        <MapSelection coordinates={coordinates} onSelect={(nextCoordinates, label) => {
          setSelectedLabel(label);
          onSelect(nextCoordinates, label);
        }} />
      </MapContainer>
      <p className="location-picker-help">
        Search, click the map, or drag the marker to the exact problem location.
      </p>
      {selectedLabel && <p className="selected-location-label" aria-live="polite">{selectedLabel}</p>}
      {coordinates && (
        <p className="location-picker-coordinates">
          Coordinates: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
        </p>
      )}
      {gpsMessage && <p className="gps-message" role="status">{gpsMessage}</p>}
      <button
        type="button"
        className={`primary-button confirm-location-button ${confirmed ? "confirmed" : ""}`}
        onClick={() => onConfirm(true)}
        disabled={!coordinates}
      >
        {confirmed ? "Problem Location Confirmed" : "Confirm Problem Location"}
      </button>
    </div>
  );
}
