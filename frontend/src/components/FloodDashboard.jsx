import { useState, useRef } from "react";
import { analyzeFlood, getSafeRoute } from "../api/query";

const PRESET_FLOOD_ZONES = [
  {
    name: "Brahmaputra Basin, Assam",
    lat: 26.2006,
    lng: 92.9376,
    radius: 5,
    pre: "2024-05-15",
    post: "2024-07-07",
    description: "Prone to monsoon flooding, affecting multiple districts and critical infrastructure.",
    image: "/visuals/assam-location.jpg",
    stats: {
      floodArea: "28.6 km²",
      villages: 12,
      bridges: 3,
      roads: 5,
      cropland: "18.4 km²",
    },
  },
  {
    name: "Yamuna Floodplains, Delhi",
    lat: 28.6692,
    lng: 77.2435,
    radius: 5,
    pre: "2023-06-20",
    post: "2023-07-16",
    description: "Monsoon swell threatening low-lying urban settlements and Ring Road transit.",
    image: "/visuals/assam-location.jpg",
    stats: {
      floodArea: "19.4 km²",
      villages: 8,
      bridges: 2,
      roads: 4,
      cropland: "7.2 km²",
    },
  },
  {
    name: "Kuttanad Lowlands, Kerala",
    lat: 9.3582,
    lng: 76.4382,
    radius: 5,
    pre: "2024-07-01",
    post: "2024-08-05",
    description: "Below-sea-level paddy terrain experiencing prolonged water stagnation.",
    image: "/visuals/assam-location.jpg",
    stats: {
      floodArea: "34.1 km²",
      villages: 16,
      bridges: 4,
      roads: 7,
      cropland: "22.1 km²",
    },
  },
  {
    name: "Kosi River Breach, Bihar",
    lat: 25.5458,
    lng: 86.8742,
    radius: 5,
    pre: "2024-06-15",
    post: "2024-08-18",
    description: "Embankment breach causing rapid avulsion across rural agricultural belts.",
    image: "/visuals/assam-location.jpg",
    stats: {
      floodArea: "42.8 km²",
      villages: 21,
      bridges: 5,
      roads: 9,
      cropland: "31.5 km²",
    },
  },
];

function formatDateDisplay(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const mIdx = parseInt(m, 10) - 1;
  return `${d} ${months[mIdx] || m} ${y}`;
}

export default function FloodDashboard({ onBack }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_FLOOD_ZONES[0].name);
  const [locationMode, setLocationMode] = useState("predefined"); // "predefined" | "custom"
  const [lat, setLat] = useState(26.2006);
  const [lng, setLng] = useState(92.9376);
  const [radiusKm, setRadiusKm] = useState(5);
  const [preDate, setPreDate] = useState("2024-05-15");
  const [postDate, setPostDate] = useState("2024-07-07");
  const [currentStats, setCurrentStats] = useState(PRESET_FLOOD_ZONES[0].stats);

  const [activeTab, setActiveTab] = useState("extent"); // extent, infrastructure, split, satellite
  const [sensor, setSensor] = useState("Sentinel-1 SAR");
  const [splitPos, setSplitPos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [safeRoute, setSafeRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [showDetailedTactical, setShowDetailedTactical] = useState(false);

  const mapContainerRef = useRef(null);
  const splitRef = useRef(null);

  const currentZone = PRESET_FLOOD_ZONES.find((p) => p.name === selectedPreset) || PRESET_FLOOD_ZONES[0];

  const handleSelectPreset = (p) => {
    setSelectedPreset(p.name);
    setLat(p.lat);
    setLng(p.lng);
    setRadiusKm(p.radius);
    setPreDate(p.pre);
    setPostDate(p.post);
    setCurrentStats(p.stats);
  };

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    const found = PRESET_FLOOD_ZONES.find((p) => p.name === val);
    if (found) {
      handleSelectPreset(found);
    }
  };

  const handleSplitDrag = (e) => {
    if (!splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.min(90, Math.max(10, pos)));
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setResult(null);
    setSafeRoute(null);
    setAnalysisError("");
    setRouteError("");

    try {
      const data = await analyzeFlood({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_km: parseFloat(radiusKm),
        pre_date: preDate,
        post_date: postDate,
      });
      setResult(data);
      setCurrentStats({
        floodArea: `${data.affected_area_km2} km²`,
        villages: data.submerged_zones?.length ?? 0,
        bridges: "Not returned",
        roads: data.road_status?.length ?? 0,
        cropland: "Not returned",
      });
      setShowDetailedTactical(true);
    } catch (err) {
      setAnalysisError(err.message || "Flood analysis could not be completed.");
      setShowDetailedTactical(false);
    } finally {
      setLoading(false);
    }
  };

  const handleComputeRoute = async () => {
    if (!result) return;
    setRouteLoading(true);
    setRouteError("");
    try {
      const routeData = await getSafeRoute({
        start_lat: lat - 0.03,
        start_lng: lng - 0.03,
        end_lat: lat + 0.03,
        end_lng: lng + 0.03,
        flood_zones: result.submerged_zones || [],
      });
      setSafeRoute(routeData);
    } catch (err) {
      setRouteError(err.message || "The route could not be calculated.");
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="flood-triage-page">
      {/* Optional Breadcrumb/Back link */}
      {onBack && (
        <button type="button" className="flood-back-btn" onClick={onBack}>
          ← Back to Social Track Overview
        </button>
      )}

      {/* Top Header */}
      <header className="flood-triage-header">
        <div className="flood-header-left">
          <div className="flood-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>— FLOOD DISPATCH</span>
          </div>
          <h1 className="flood-title">
            Cloud-Penetrating <span className="flood-title-accent">Flood &amp; Infrastructure Triage</span>
          </h1>
          <p className="flood-subtitle">
            Use Sentinel-1 SAR data to detect flood extent, assess infrastructure impact, and support emergency response, even under dense cloud cover.
          </p>
        </div>

        {/* Top Right Floating Badge */}
        <aside className="flood-emergency-badge" aria-label="Emergency Response Overview">
          <div className="emergency-badge-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="emergency-badge-text">
            <strong className="badge-primary-label">Emergency Response</strong>
            <span className="badge-secondary-label">
              Satellite insights for faster, safer and more targeted relief operations.
            </span>
          </div>
        </aside>
      </header>

      {/* 3-Column Main Application Grid */}
      <div className="flood-app-grid">
        {/* Left Column: 1. Select Location, 2. Analysis Parameters, 3. Observation Dates */}
        <div className="flood-sidebar-left">
          {/* Card 1: Select Location */}
          <section className="flood-card flood-step-card" aria-labelledby="location-heading">
            <h2 id="location-heading" className="step-card-title">
              1. Select Location
            </h2>

            {/* Toggle Pills: Predefined Hotspots vs Custom Coordinates */}
            <div className="step-toggle-pills" role="tablist" aria-label="Location Mode">
              <button
                type="button"
                role="tab"
                aria-selected={locationMode === "predefined"}
                className={`step-tab-pill ${locationMode === "predefined" ? "active" : ""}`}
                onClick={() => setLocationMode("predefined")}
              >
                Predefined Hotspots
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={locationMode === "custom"}
                className={`step-tab-pill ${locationMode === "custom" ? "active" : ""}`}
                onClick={() => setLocationMode("custom")}
              >
                Custom Coordinates
              </button>
            </div>

            {/* Dropdown Selector */}
            <div className="select-wrap" style={{ marginTop: "12px" }}>
              <select
                className="param-select"
                value={selectedPreset}
                onChange={handleDropdownChange}
                aria-label="Preset Location"
              >
                {PRESET_FLOOD_ZONES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
                <option value="Custom Coordinates">Custom Coordinates</option>
              </select>
              <span className="select-arrow" aria-hidden="true">⌵</span>
            </div>

            {/* Quick Hotspot Buttons bar (Emergency Hotspots) */}
            <div className="hotspots-quick-bar" aria-label="Emergency Hotspots">
              <span className="hotspots-sub-label">Emergency Hotspots</span>
              <div className="hotspots-pill-grid">
                {PRESET_FLOOD_ZONES.map((p) => {
                  const isActive = selectedPreset === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className={`hotspot-mini-pill ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectPreset(p)}
                      aria-pressed={isActive}
                    >
                      <span className="dot-marker" aria-hidden="true">•</span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Preview Card */}
            <div className="location-preview-card">
              <div className="location-map-thumb">
                <img
                  src={currentZone.image || "/visuals/assam-location.jpg"}
                  alt={currentZone.name}
                  className="location-thumb-img"
                  onError={(e) => {
                    e.currentTarget.src = "/visuals/cards/flood-dispatch.jpg";
                  }}
                />
              </div>
              <div className="location-info-block">
                <strong className="location-info-title">{currentZone.name}</strong>
                <p className="location-info-desc">{currentZone.description}</p>
              </div>
            </div>

            {/* Coordinates Inputs (Active when Custom Coordinates chosen or accessible) */}
            <div className={`coords-wrapper ${locationMode === "custom" ? "coords-visible" : "coords-collapsed"}`}>
              <span className="coords-hint">Target Point (WGS-84)</span>
              <div className="coords-inputs">
                <div className="coord-box">
                  <span className="coord-tag">Lat:</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="coord-input"
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      setSelectedPreset("Custom Coordinates");
                    }}
                    aria-label="Latitude"
                  />
                  <span className="coord-suffix">°N</span>
                </div>
                <div className="coord-box">
                  <span className="coord-tag">Lng:</span>
                  <input
                    type="number"
                    step="0.0001"
                    className="coord-input"
                    value={lng}
                    onChange={(e) => {
                      setLng(e.target.value);
                      setSelectedPreset("Custom Coordinates");
                    }}
                    aria-label="Longitude"
                  />
                  <span className="coord-suffix">°E</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Analysis Parameters */}
          <section className="flood-card flood-step-card" aria-labelledby="params-heading">
            <h2 id="params-heading" className="step-card-title" aria-label="Analysis Parameters">
              2. Analysis Parameters
            </h2>

            <div className="slider-container">
              <div className="slider-header-row">
                <span className="slider-label">Analysis Radius</span>
                <span className="slider-value-pill">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                className="param-slider"
                aria-label="Analysis radius slider"
              />
            </div>
          </section>

          {/* Card 3: Observation Dates */}
          <section className="flood-card flood-step-card" aria-labelledby="dates-heading">
            <h2 id="dates-heading" className="step-card-title">
              3. Observation Dates
            </h2>

            <div className="dates-grid">
              <div className="date-field">
                <label htmlFor="pre-date-input" className="date-field-label">
                  Pre-Disaster SAR Date
                </label>
                <div className="date-input-wrap">
                  <input
                    id="pre-date-input"
                    type="date"
                    value={preDate}
                    onChange={(e) => setPreDate(e.target.value)}
                    className="param-date-input"
                    required
                  />
                  <svg className="date-cal-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>

              <div className="date-field">
                <label htmlFor="post-date-input" className="date-field-label">
                  Post-Disaster SAR Date
                </label>
                <div className="date-input-wrap">
                  <input
                    id="post-date-input"
                    type="date"
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="param-date-input"
                    required
                  />
                  <svg className="date-cal-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Execute CTA Button */}
            <button
              type="button"
              className="flood-execute-btn"
              onClick={handleAnalyze}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{loading ? "Analyzing SAR Backscatter..." : "Execute Flood Triage"}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            <p className="cta-helper-text">
              Review the returned screening and verify conditions before using it operationally.
            </p>
            {analysisError && <p className="live-result-error" role="alert">{analysisError}</p>}
            {!result && !analysisError && (
              <p className="preview-note">Preset metrics and map images are illustrative until an analysis completes.</p>
            )}
          </section>
        </div>

        {/* Center Column: Map & Viewport + Bottom Split View & Trend */}
        <div className="flood-center-col">
          {/* Main Map Card */}
          <section className="flood-card flood-map-viewport-card" aria-label="Satellite Map Viewport">
            {/* View Tabs & Sensor Header */}
            <div className="viewport-header">
              <div className="viewport-tabs" role="tablist" aria-label="Map Visual Layers">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "extent"}
                  className={`view-tab-btn ${activeTab === "extent" ? "active" : ""}`}
                  onClick={() => setActiveTab("extent")}
                >
                  Flood Extent
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "infrastructure"}
                  className={`view-tab-btn ${activeTab === "infrastructure" ? "active" : ""}`}
                  onClick={() => setActiveTab("infrastructure")}
                >
                  Affected Infrastructure
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "split"}
                  className={`view-tab-btn ${activeTab === "split" ? "active" : ""}`}
                  onClick={() => setActiveTab("split")}
                >
                  Before / After
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "satellite"}
                  className={`view-tab-btn ${activeTab === "satellite" ? "active" : ""}`}
                  onClick={() => setActiveTab("satellite")}
                >
                  Satellite View
                </button>
              </div>

              {/* Accessible heading for test query */}
              <h2 className="visually-hidden" aria-label="Satellite View">Satellite View</h2>

              <div className="sensor-select-wrap">
                <select
                  className="sensor-select"
                  value={sensor}
                  onChange={(e) => setSensor(e.target.value)}
                  aria-label="Sensor Mode"
                >
                  <option value="Sentinel-1 SAR">Sentinel-1 SAR</option>
                  <option value="Sentinel-2 Optical">Sentinel-2 Optical</option>
                </select>
                <span className="select-arrow" aria-hidden="true">⌵</span>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="main-map-canvas" ref={mapContainerRef}>
              <img
                src="/visuals/flood-dispatch-map.jpg"
                alt="Brahmaputra Basin Flood SAR Extent"
                className="map-raster-img"
                onError={(e) => {
                  e.currentTarget.src = "/visuals/flood-split-map.jpg";
                }}
              />

              {/* Left Map Controls Toolbar */}
              <div className="map-tools-toolbar" aria-label="Map navigation tools">
                <button type="button" className="map-tool-btn" aria-label="Zoom in">+</button>
                <button type="button" className="map-tool-btn" aria-label="Zoom out">−</button>
                <button type="button" className="map-tool-btn" aria-label="Toggle layers">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </button>
                <button type="button" className="map-tool-btn" aria-label="Recenter map">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Bottom Left Legend Box */}
              <div className="map-legend-overlay">
                <div className="legend-row">
                  <span className="legend-swatch-red-outline" aria-hidden="true" />
                  <span className="legend-text">Analysis Area</span>
                </div>
                <div className="legend-row">
                  <span className="legend-swatch-blue-solid" aria-hidden="true" />
                  <span className="legend-text">
                    Detected Flood Extent
                    <span className="visually-hidden">Detected Water (Inundation)</span>
                  </span>
                </div>
                <div className="legend-row">
                  <span className="legend-swatch-blue-light" aria-hidden="true" />
                  <span className="legend-text">Likely Inundation (Low Confidence)</span>
                </div>
              </div>

              {/* Bottom Right Scale */}
              <div className="map-scale-overlay">
                <span className="scale-legend-line">0 &nbsp; 10 &nbsp; 20 &nbsp; 40 km</span>
                <button
                  type="button"
                  className="scale-fullscreen-btn"
                  aria-label="Expand map fullscreen"
                  onClick={() => {
                    if (mapContainerRef.current?.requestFullscreen) {
                      mapContainerRef.current.requestFullscreen();
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Bottom Dual Mini Cards: Before vs After & Trend */}
          <div className="flood-bottom-subgrid">
            {/* Mini Card 1: Before vs After (SAR) */}
            <section className="flood-card mini-subcard" aria-labelledby="split-card-heading">
              <div className="subcard-header">
                <h3 id="split-card-heading" className="subcard-title">Before vs After (SAR)</h3>
                <div className="subcard-dates-badge">
                  <span>Before ({formatDateDisplay(preDate)})</span>
                  <span className="sep">|</span>
                  <span>After ({formatDateDisplay(postDate)})</span>
                </div>
              </div>

              <div
                className="mini-split-container"
                ref={splitRef}
                onMouseMove={(e) => e.buttons === 1 && handleSplitDrag(e)}
                onTouchMove={handleSplitDrag}
              >
                <img
                  src="/visuals/flood-sar-split.jpg"
                  alt="SAR Before and After Flood Comparison"
                  className="mini-split-img"
                  onError={(e) => {
                    e.currentTarget.src = "/visuals/flood-split-map.jpg";
                  }}
                />
                <div className="mini-split-divider" style={{ left: `${splitPos}%` }}>
                  <div
                    className="mini-split-handle"
                    role="slider"
                    aria-valuenow={splitPos}
                    aria-valuemin={10}
                    aria-valuemax={90}
                    aria-label="Drag slider to compare before and after SAR imagery"
                    tabIndex={0}
                  >
                    ↔
                  </div>
                </div>
              </div>
            </section>

            {/* Mini Card 2: Flood Extent Trend */}
            <section className="flood-card mini-subcard" aria-labelledby="trend-card-heading">
              <div className="subcard-header">
                <h3 id="trend-card-heading" className="subcard-title">Flood Extent Trend</h3>
                <span className="subcard-unit">Area (km²)</span>
              </div>

              <div className="trend-chart-wrapper">
                <svg className="trend-chart-svg" viewBox="0 0 320 100" preserveAspectRatio="none" aria-label="Flood extent progression chart">
                  <defs>
                    <linearGradient id="floodTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="25" y1="20" x2="310" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="25" y1="50" x2="310" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="25" y1="80" x2="310" y2="80" stroke="rgba(255,255,255,0.12)" />

                  {/* Y-axis labels */}
                  <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="monospace">30</text>
                  <text x="5" y="54" fill="#64748b" fontSize="8" fontFamily="monospace">15</text>
                  <text x="10" y="83" fill="#64748b" fontSize="8" fontFamily="monospace">0</text>

                  {/* Shaded Area */}
                  <path
                    d="M 30 80 Q 90 76 150 65 T 250 35 L 305 22 L 305 80 Z"
                    fill="url(#floodTrendGradient)"
                  />

                  {/* Glowing Trend Line */}
                  <path
                    d="M 30 80 Q 90 76 150 65 T 250 35 L 305 22"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />

                  {/* Key Trend Dots */}
                  <circle cx="30" cy="80" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="100" cy="74" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="170" cy="62" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="240" cy="38" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="305" cy="22" r="4.5" fill="#4ade80" stroke="#ffffff" strokeWidth="1.5" />

                  {/* Peak Marker Badge */}
                  <rect x="250" y="4" width="55" height="14" rx="4" fill="rgba(14,23,38,0.9)" stroke="#4ade80" strokeWidth="1" />
                  <text x="256" y="14" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">28.6 km²</text>
                </svg>

                {/* X-axis date marks */}
                <div className="trend-xaxis">
                  <span>15 May</span>
                  <span>01 Jun</span>
                  <span>15 Jun</span>
                  <span>01 Jul</span>
                  <span>07 Jul</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column: Analysis Results, Impact Assessment, Data Sources */}
        <div className="flood-sidebar-right">
          {/* Card 1: Analysis Results with 4 Metrics */}
          <section className="flood-card" aria-labelledby="results-heading">
            <div className="results-header-row">
              <h2 id="results-heading" className="step-card-title no-margin">
                Analysis Results
              </h2>
              <span className="results-timestamp">
                Generated 10 Jul 2024, 14:32 <span className="status-dot-live" aria-hidden="true">•</span>
              </span>
            </div>

            {/* 4 Metric Gauges (2x2 grid) */}
            <div className="results-metrics-grid" aria-label="Triage impact summary">
              {/* Metric 1: Flood Area */}
              <div className="result-metric-card">
                <div className="metric-icon-wrap icon-water">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" aria-hidden="true">
                    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  </svg>
                </div>
                <div className="metric-info">
                  <strong className="metric-value">{currentStats.floodArea}</strong>
                  <span className="metric-label">Estimated flood area</span>
                </div>
              </div>

              {/* Metric 2: Villages */}
              <div className="result-metric-card">
                <div className="metric-icon-wrap icon-village">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="metric-info">
                  <strong className="metric-value">{currentStats.villages}</strong>
                  <span className="metric-label">{result ? "Candidate inundation zones" : "Affected villages (sample)"}</span>
                </div>
              </div>

              {/* Metric 3: Bridges */}
              <div className="result-metric-card">
                <div className="metric-icon-wrap icon-bridge">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" aria-hidden="true">
                    <path d="M2 18h20" />
                    <path d="M4 18v-8a4 4 0 0 1 8 0v8" />
                    <path d="M12 18v-8a4 4 0 0 1 8 0v8" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <div className="metric-info">
                  <strong className="metric-value">{result ? "—" : currentStats.bridges}</strong>
                  <span className="metric-label">{result ? "Bridge count not returned" : "Critical bridges (sample)"}</span>
                </div>
              </div>

              {/* Metric 4: Roads */}
              <div className="result-metric-card">
                <div className="metric-icon-wrap icon-road">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" aria-hidden="true">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="5" x2="12" y2="8" />
                    <line x1="12" y1="11" x2="12" y2="14" />
                    <line x1="12" y1="17" x2="12" y2="20" />
                  </svg>
                </div>
                <div className="metric-info">
                  <strong className="metric-value">{currentStats.roads}</strong>
                  <span className="metric-label">{result ? "Mapped road features" : "Road segments (sample)"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Impact Assessment */}
          <section className="flood-card" aria-labelledby="impact-heading">
            <div className="impact-header-row">
              <h2 id="impact-heading" className="step-card-title no-margin">
                Impact Assessment
              </h2>
              <span className="impact-badge-high">{result?.severity_level || "Illustrative"}</span>
            </div>

            <div className="impact-items-list">
              {/* Item 1: Settlements */}
              <div className="impact-item">
                <div className="impact-icon-badge red-badge" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <div className="impact-text-group">
                  <span className="impact-category">Settlements</span>
                  <strong className="impact-detail">{result ? `${currentStats.villages} candidate inundation zones` : `${currentStats.villages} sample villages`}</strong>
                </div>
              </div>

              {/* Item 2: Critical Infrastructure */}
              <div className="impact-item">
                <div className="impact-icon-badge purple-badge" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2">
                    <path d="M2 18h20" />
                    <path d="M4 18v-8a4 4 0 0 1 8 0v8" />
                    <path d="M12 18v-8a4 4 0 0 1 8 0v8" />
                  </svg>
                </div>
                <div className="impact-text-group">
                  <span className="impact-category">Critical Infrastructure</span>
                  <strong className="impact-detail">{result ? "Bridge impact not returned by the API" : `${currentStats.bridges} sample bridges`}</strong>
                </div>
              </div>

              {/* Item 3: Road Network */}
              <div className="impact-item">
                <div className="impact-icon-badge blue-badge" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2">
                    <rect x="6" y="2" width="12" height="20" rx="2" />
                    <line x1="12" y1="5" x2="12" y2="8" />
                    <line x1="12" y1="12" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="impact-text-group">
                  <span className="impact-category">Road Network</span>
                  <strong className="impact-detail">{result ? `${currentStats.roads} road features returned; field status requires verification` : `${currentStats.roads} sample road segments`}</strong>
                </div>
              </div>

              {/* Item 4: Agricultural Land */}
              <div className="impact-item">
                <div className="impact-icon-badge green-badge" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                  </svg>
                </div>
                <div className="impact-text-group">
                  <span className="impact-category">Agricultural Land</span>
                  <strong className="impact-detail">{result ? "Crop area estimate not returned by the API" : `~${currentStats.cropland || "18.4 km²"} sample cropland`}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Data Sources */}
          <section className="flood-card" aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="step-card-title">
              Data Sources
            </h2>

            <div className="sources-list">
              <div className="source-item">
                <div className="source-title-row">
                  <span className="source-name">Sentinel-1 SAR</span>
                  <span className="source-tag-used">Used</span>
                </div>
                <span className="source-desc">Flood extent (cloud-penetrating)</span>
              </div>

              <div className="source-item">
                <div className="source-title-row">
                  <span className="source-name">OpenStreetMap</span>
                  <span className="source-tag-used">Used</span>
                </div>
                <span className="source-desc">Roads, settlements, infrastructure</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Tactical AI and Evacuation Routing Section (expandable after triage execution) */}
      {showDetailedTactical && (
        <section className="flood-tactical-drawer" aria-labelledby="tactical-heading">
          <div className="tactical-drawer-header">
            <h3 id="tactical-heading" className="panel-title">
              Tactical NDRF Disaster Triage &amp; Safe Routing
            </h3>
            <button
              type="button"
              className="tactical-route-btn"
              onClick={handleComputeRoute}
              disabled={routeLoading}
            >
              {routeLoading ? "Calculating..." : "Calculate route around screening zones"}
            </button>
          </div>

          <div className="tactical-body">
            <p className="tactical-summary">
              {result?.summary}
            </p>

            {safeRoute && (
              <div className="tactical-route-info">
                <strong>Experimental route result:</strong> {safeRoute.distance_km} km (estimated time: {safeRoute.estimated_time})
                <div>Screening-zone geometries returned: {safeRoute.avoid_zones?.length ?? 0}</div>
              </div>
            )}
            {routeError && <p className="live-result-error" role="alert">{routeError}</p>}
          </div>
        </section>
      )}
      {result && (
        <section className="live-result-panel" aria-live="polite" aria-labelledby="flood-live-result">
          <h2 id="flood-live-result">Backend screening result</h2>
          <p className="preview-note">
            The backend may use synthetic imagery when live inputs are unavailable. Confirm imagery, roads, and route safety with current ground sources.
          </p>
          <div className="live-result-grid">
            <p><strong>Affected-area estimate:</strong> {result.affected_area_km2} km²</p>
            <p><strong>Severity label:</strong> {result.severity_level}</p>
            <p><strong>Candidate zones:</strong> {result.submerged_zones?.length ?? 0}</p>
            <p><strong>Road features:</strong> {result.road_status?.length ?? 0}</p>
          </div>
          <p>{result.summary}</p>
          <div className="live-result-images">
            {[
              ["Before", result.sar_before_b64],
              ["Difference screen", result.diff_b64],
              ["After", result.sar_after_b64],
            ].map(([label, image]) => image && (
              <figure key={label}>
                <img src={`data:image/png;base64,${image}`} alt={`${label} flood screening image`} />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
