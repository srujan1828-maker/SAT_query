import { useState, useRef } from "react";
import { analyzeEnvironment } from "../api/query";

const PRESET_ENVIRONMENT_ZONES = [
  {
    name: "Chandigarh Surrounding Forests",
    lat: 30.7421,
    lng: 76.8188,
    type: "deforestation",
    sDate: "2023-01-01",
    eDate: "2024-07-01",
    areaAnalyzed: "125.6 km²",
    forestLoss: "12.4 km²",
    forestChange: "-9.8%",
    alertsCount: 2,
    concern: "High Concern",
    desc: "Shivalik foothill reserve facing rapid canopy thinning and illicit felling along seasonal rivulets.",
    distribution: { forest: 62.3, agriculture: 18.4, builtup: 8.1, water: 4.2, bare: 7.0 },
    detections: [
      { id: 1, title: "Forest Loss Detected", areaDate: "12.4 km² · 01 Jul 2024", severity: "High", image: "/visuals/env-detect-forest.jpg" },
      { id: 2, title: "New Land Disturbance", areaDate: "3.1 km² · 28 Jun 2024", severity: "Medium", image: "/visuals/env-detect-land.jpg" },
      { id: 3, title: "Water Body Reduction", areaDate: "-5.2% area · 20 Jun 2024", severity: "Medium", image: "/visuals/env-detect-water.jpg" },
    ],
  },
  {
    name: "Yamuna Riverbed, Panipat",
    lat: 29.3909,
    lng: 76.9635,
    type: "mining",
    sDate: "2023-01-01",
    eDate: "2024-07-01",
    areaAnalyzed: "94.2 km²",
    forestLoss: "8.6 km²",
    forestChange: "-12.1%",
    alertsCount: 4,
    concern: "Critical Concern",
    desc: "Heavy unpermitted mechanised sand dredging altering active riverbed channel morphology.",
    distribution: { forest: 14.5, agriculture: 38.2, builtup: 16.3, water: 12.0, bare: 19.0 },
    detections: [
      { id: 1, title: "Active Dredging Pits", areaDate: "4.8 km² · 29 Jun 2024", severity: "High", image: "/visuals/env-detect-land.jpg" },
      { id: 2, title: "Riparian Buffer Loss", areaDate: "2.3 km² · 22 Jun 2024", severity: "High", image: "/visuals/env-detect-forest.jpg" },
      { id: 3, title: "Channel Flow Deviation", areaDate: "-7.4% flow · 15 Jun 2024", severity: "Medium", image: "/visuals/env-detect-water.jpg" },
    ],
  },
  {
    name: "Sukhna Lake Wetland, Chandigarh",
    lat: 30.7421,
    lng: 76.8188,
    type: "water_shrinkage",
    sDate: "2023-01-01",
    eDate: "2024-07-01",
    areaAnalyzed: "48.0 km²",
    forestLoss: "3.2 km²",
    forestChange: "-6.4%",
    alertsCount: 1,
    concern: "Medium Concern",
    desc: "Desiccation of shallow wetland margins with siltation choking seasonal tributary inflows.",
    distribution: { forest: 35.0, agriculture: 22.0, builtup: 21.0, water: 14.0, bare: 8.0 },
    detections: [
      { id: 1, title: "Water Perimeter Retraction", areaDate: "-8.1% area · 25 Jun 2024", severity: "Medium", image: "/visuals/env-detect-water.jpg" },
      { id: 2, title: "Catchment Soil Erosion", areaDate: "1.9 km² · 18 Jun 2024", severity: "Medium", image: "/visuals/env-detect-land.jpg" },
      { id: 3, title: "Wetland Silt Accumulation", areaDate: "0.8 km² · 10 Jun 2024", severity: "Low", image: "/visuals/env-detect-forest.jpg" },
    ],
  },
  {
    name: "Haridwar Protected Foothills",
    lat: 29.9457,
    lng: 78.1642,
    type: "deforestation",
    sDate: "2023-01-01",
    eDate: "2024-07-01",
    areaAnalyzed: "160.5 km²",
    forestLoss: "18.2 km²",
    forestChange: "-11.3%",
    alertsCount: 3,
    concern: "High Concern",
    desc: "Canopy destruction along protected eco-sensitive zones bordering Rajaji National Park buffer.",
    distribution: { forest: 71.0, agriculture: 12.0, builtup: 6.0, water: 5.0, bare: 6.0 },
    detections: [
      { id: 1, title: "Hillside Clear-Cutting", areaDate: "11.2 km² · 27 Jun 2024", severity: "High", image: "/visuals/env-detect-forest.jpg" },
      { id: 2, title: "Road Encroachment Patch", areaDate: "4.5 km² · 20 Jun 2024", severity: "High", image: "/visuals/env-detect-land.jpg" },
      { id: 3, title: "River Silt Washout", areaDate: "2.5 km² · 12 Jun 2024", severity: "Medium", image: "/visuals/env-detect-water.jpg" },
    ],
  },
];

function downloadBase64File(encoded, filename, contentType) {
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function EnvironmentWatch() {
  const [selectedType, setSelectedType] = useState("deforestation"); // deforestation, mining, water_body, urban
  const [regionMode, setRegionMode] = useState("predefined"); // predefined, custom
  const [selectedZone, setSelectedZone] = useState(PRESET_ENVIRONMENT_ZONES[0].name);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2024-07-01");

  const [activeTab, setActiveTab] = useState("map"); // map, split, timeseries, change, insights
  const [sensor, setSensor] = useState("Sentinel-2 (NDVI)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [selectedDetectionModal, setSelectedDetectionModal] = useState(null);

  const mapContainerRef = useRef(null);

  const currentZone = PRESET_ENVIRONMENT_ZONES.find((z) => z.name === selectedZone) || PRESET_ENVIRONMENT_ZONES[0];

  const handleZoneChange = (e) => {
    const val = e.target.value;
    setSelectedZone(val);
    const found = PRESET_ENVIRONMENT_ZONES.find((z) => z.name === val);
    if (found) {
      setSelectedType(found.type);
      setStartDate(found.sDate);
      setEndDate(found.eDate);
    }
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setAnalysisError("");
    setResult(null);

    try {
      const data = await analyzeEnvironment({
        lat: currentZone.lat,
        lng: currentZone.lng,
        radius_km: 5.0,
        start_date: startDate,
        end_date: endDate,
        analysis_type: selectedType,
      });
      setResult(data);
    } catch (err) {
      setAnalysisError(err.message || "Environmental analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPetition = () => {
    if (!result?.petition_b64) {
      setAnalysisError("The backend did not return a petition draft to download.");
      return;
    }
    downloadBase64File(
      result.petition_b64,
      "satquery-petition-draft.json",
      "application/json",
    );
  };

  return (
    <div className="env-watch-page">
      {/* Top Header */}
      <header className="env-watch-header">
        <div className="env-header-left">
          <div className="env-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>— ENVIRONMENTAL WATCHDOG</span>
          </div>
          <h1 className="env-title">
            Monitor. Detect. <span className="env-title-accent">Protect.</span>
          </h1>
          <p className="env-subtitle">
            Review screening results for vegetation, mining, and water-body change. Outputs require independent verification.
          </p>
          <p className="preview-note">
            Dashboard images and preset metrics are illustrative until a backend analysis completes.
          </p>
        </div>

        {/* Top Right Floating Badge */}
        <aside className="env-ecosystem-badge" aria-label="Preserve Our Ecosystems Badge">
          <div className="ecosystem-badge-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div className="ecosystem-badge-text">
            <strong className="ecosystem-badge-title">Preserve Our Ecosystems</strong>
            <span className="ecosystem-badge-sub">Real-time satellite monitoring for a greener, safer future.</span>
          </div>
        </aside>
      </header>

      {/* 3-Column Main Grid */}
      <div className="env-app-grid">
        {/* Left Column: Form Controls */}
        <div className="env-sidebar-left">
          {/* Card 1: 1. Select Analysis Type */}
          <section className="env-card env-step-card" aria-labelledby="analysis-type-heading">
            <h2 id="analysis-type-heading" className="env-step-title">
              <span className="step-num-icon" aria-hidden="true">👤</span> 1. Select Analysis Type
            </h2>

            <div className="analysis-types-grid" role="radiogroup" aria-label="Analysis Type">
              {/* Type 1: Deforestation */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedType === "deforestation"}
                className={`type-tile ${selectedType === "deforestation" ? "active" : ""}`}
                onClick={() => setSelectedType("deforestation")}
              >
                <div className="type-icon-box icon-tree" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 19 22 19 12 2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
                <div className="type-tile-text">
                  <strong className="type-name">Deforestation</strong>
                  <span className="type-sub">Forest cover change</span>
                </div>
              </button>

              {/* Type 2: Illegal Mining */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedType === "mining"}
                className={`type-tile ${selectedType === "mining" ? "active" : ""}`}
                onClick={() => setSelectedType("mining")}
              >
                <div className="type-icon-box icon-mining" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M17 18h2" />
                    <path d="M5 18h2" />
                  </svg>
                </div>
                <div className="type-tile-text">
                  <strong className="type-name">Illegal Mining</strong>
                  <span className="type-sub">Surface disturbance</span>
                </div>
              </button>

              {/* Type 3: Water Body Changes */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedType === "water_shrinkage"}
                className={`type-tile ${selectedType === "water_shrinkage" ? "active" : ""}`}
                onClick={() => setSelectedType("water_shrinkage")}
              >
                <div className="type-icon-box icon-water" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
                <div className="type-tile-text">
                  <strong className="type-name">Water Body Changes</strong>
                  <span className="type-sub">Lake/River/Reservoir</span>
                </div>
              </button>

              {/* Type 4: Urban Expansion */}
              <button
                type="button"
                role="radio"
                aria-checked="false"
                aria-disabled="true"
                className="type-tile"
                disabled
                title="Urban expansion analysis is not supported by the current backend API."
              >
                <div className="type-icon-box icon-urban" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" />
                    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                  </svg>
                </div>
                <div className="type-tile-text">
                  <strong className="type-name">Urban Expansion</strong>
                  <span className="type-sub">Land use change</span>
                </div>
              </button>
            </div>
          </section>

          {/* Card 2: 2. Select Region */}
          <section className="env-card env-step-card" aria-labelledby="region-heading">
            <h2 id="region-heading" className="env-step-title">
              <span className="step-num-icon" aria-hidden="true">📍</span> 2. Select Region
            </h2>

            {/* Toggle Pills: Predefined Areas vs Custom Area */}
            <div className="step-toggle-pills" role="tablist" aria-label="Region Selection Mode">
              <button
                type="button"
                role="tab"
                aria-selected={regionMode === "predefined"}
                className={`step-tab-pill ${regionMode === "predefined" ? "active" : ""}`}
                onClick={() => setRegionMode("predefined")}
              >
                Predefined Areas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={regionMode === "custom"}
                className={`step-tab-pill ${regionMode === "custom" ? "active" : ""}`}
                onClick={() => setRegionMode("custom")}
              >
                Custom Area
              </button>
            </div>

            {/* Region Dropdown */}
            <div className="select-wrap" style={{ marginTop: "12px" }}>
              <div className="input-prefix-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <select
                className="param-select with-icon"
                value={selectedZone}
                onChange={handleZoneChange}
                aria-label="Preset Region"
              >
                {PRESET_ENVIRONMENT_ZONES.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name}
                  </option>
                ))}
                <option value="Custom Coordinates">Custom Coordinates</option>
              </select>
              <span className="select-arrow" aria-hidden="true">⌵</span>
            </div>
          </section>

          {/* Card 3: 3. Select Date Range */}
          <section className="env-card env-step-card" aria-labelledby="daterange-heading">
            <h2 id="daterange-heading" className="env-step-title">
              <span className="step-num-icon" aria-hidden="true">📅</span> 3. Select Date Range
            </h2>

            <div className="env-dates-row">
              <div className="date-input-wrap">
                <input
                  type="date"
                  className="param-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Start Date"
                />
                <svg className="date-cal-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>

              <span className="date-arrow-sep" aria-hidden="true">→</span>

              <div className="date-input-wrap">
                <input
                  type="date"
                  className="param-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End Date"
                />
                <svg className="date-cal-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
          </section>

          {/* CTA Button */}
          <button
            type="button"
            className="env-analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            <span>{loading ? "Analyzing Satellite Reflectance..." : "Analyze Changes"}</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>

          <p className="cta-helper-text">
            Submit a supported screening request. Verify the imagery and measurements independently.
          </p>
          {analysisError && <p className="live-result-error" role="alert">{analysisError}</p>}
        </div>

        {/* Center Column: Satellite Analysis & Progression Dual Cards */}
        <div className="env-center-col">
          {/* Main Map Card */}
          <section className="env-card env-viewport-card" aria-label="Satellite Analysis Map">
            <div className="env-view-header">
              <div className="env-view-header-left">
                <h3 className="env-view-title">Satellite Analysis</h3>
                <div className="env-view-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "map"}
                    className={`env-tab-btn ${activeTab === "map" ? "active" : ""}`}
                    onClick={() => setActiveTab("map")}
                  >
                    Map View
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "split"}
                    className={`env-tab-btn ${activeTab === "split" ? "active" : ""}`}
                    onClick={() => setActiveTab("split")}
                  >
                    Before / After
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "timeseries"}
                    className={`env-tab-btn ${activeTab === "timeseries" ? "active" : ""}`}
                    onClick={() => setActiveTab("timeseries")}
                  >
                    Time Series
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "change"}
                    className={`env-tab-btn ${activeTab === "change" ? "active" : ""}`}
                    onClick={() => setActiveTab("change")}
                  >
                    Change Detection
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "insights"}
                    className={`env-tab-btn ${activeTab === "insights" ? "active" : ""}`}
                    onClick={() => setActiveTab("insights")}
                  >
                    Insights
                  </button>
                </div>
              </div>

              <div className="sensor-select-wrap">
                <select
                  className="sensor-select"
                  value={sensor}
                  onChange={(e) => setSensor(e.target.value)}
                  aria-label="Sensor Mode"
                >
                  <option value="Sentinel-2 (NDVI)">Sentinel-2 (NDVI)</option>
                  <option value="Sentinel-1 SAR">Sentinel-1 SAR</option>
                  <option value="True Color Optical">True Color Optical</option>
                </select>
                <span className="select-arrow" aria-hidden="true">⌵</span>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="env-map-canvas" ref={mapContainerRef}>
              <img
                src="/visuals/environment-watch-map.jpg"
                alt="Environmental change detection map"
                className="env-raster-img"
              />

              {/* Analysis Area Dashed Box and Center Badge */}
              <div className="analysis-area-badge">
                <span className="area-title">Analysis Area</span>
                <strong className="area-val">{currentZone.areaAnalyzed}</strong>
              </div>

              {/* Left Map Controls */}
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

              {/* Bottom Left Legend */}
              <div className="env-map-legend">
                <div className="env-legend-row">
                  <span className="legend-swatch-green" aria-hidden="true" />
                  <span className="legend-text">Forest Cover (2023)</span>
                </div>
                <div className="env-legend-row">
                  <span className="legend-swatch-red" aria-hidden="true" />
                  <span className="legend-text">Lost Forest Cover (2024)</span>
                </div>
              </div>

              {/* Bottom Right Scale */}
              <div className="env-map-scale">
                <span className="scale-line">0 &nbsp; 5 &nbsp; 10 &nbsp; 20 km</span>
                <button
                  type="button"
                  className="scale-expand-btn"
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

          {/* Bottom Dual Subcards: Forest Cover Change (NDVI) & Land Cover Distribution */}
          <div className="env-bottom-subgrid">
            {/* Subcard 1: Forest Cover Change (NDVI) */}
            <section className="env-card env-mini-subcard" aria-labelledby="ndvi-change-heading">
              <div className="env-subcard-header">
                <h3 id="ndvi-change-heading" className="env-subcard-title">
                  Forest Cover Change (NDVI)
                </h3>
                <div className="ndvi-legend">
                  <div className="ndvi-legend-item">
                    <span className="ndvi-dot-green" aria-hidden="true" />
                    <span>2023</span>
                  </div>
                  <div className="ndvi-legend-item">
                    <span className="ndvi-dot-red" aria-hidden="true" />
                    <span>2024</span>
                  </div>
                </div>
              </div>

              <div className="env-chart-wrapper">
                <svg className="env-chart-svg" viewBox="0 0 320 100" preserveAspectRatio="none" aria-label="NDVI forest cover change curve">
                  {/* Grid Lines */}
                  <line x1="25" y1="20" x2="310" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="25" y1="50" x2="310" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="25" y1="80" x2="310" y2="80" stroke="rgba(255,255,255,0.12)" />

                  {/* Y-axis Labels */}
                  <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="monospace">1.0</text>
                  <text x="5" y="54" fill="#64748b" fontSize="8" fontFamily="monospace">0.5</text>
                  <text x="5" y="84" fill="#64748b" fontSize="8" fontFamily="monospace">0.0</text>
                  <text x="5" y="10" fill="#64748b" fontSize="7" fontFamily="sans-serif">NDVI</text>

                  {/* 2023 Line (Green) */}
                  <path
                    d="M 30 35 Q 75 33 120 40 T 210 42 L 300 45"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <circle cx="30" cy="35" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="75" cy="33" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="120" cy="40" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="165" cy="44" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="210" cy="42" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="255" cy="43" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="300" cy="45" r="3" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />

                  {/* 2024 Line (Red) */}
                  <path
                    d="M 30 45 Q 75 48 120 58 T 210 65 L 300 68"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <circle cx="30" cy="45" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="75" cy="48" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="120" cy="58" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="165" cy="62" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="210" cy="65" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="255" cy="64" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                  <circle cx="300" cy="68" r="3" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
                </svg>

                {/* X-axis Month Marks */}
                <div className="env-chart-xaxis">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                </div>
              </div>
            </section>

            {/* Subcard 2: Land Cover Distribution (2024) */}
            <section className="env-card env-mini-subcard" aria-labelledby="landcover-heading">
              <div className="env-subcard-header">
                <h3 id="landcover-heading" className="env-subcard-title">
                  Land Cover Distribution (2024)
                </h3>
              </div>

              <div className="donut-distribution-row">
                {/* Donut Chart SVG */}
                <div className="donut-svg-wrap">
                  <svg width="86" height="86" viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="14" strokeDasharray="156 95" strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#eab308" strokeWidth="14" strokeDasharray="46 205" strokeDashoffset="-156" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f87171" strokeWidth="14" strokeDasharray="20 231" strokeDashoffset="-202" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38bdf8" strokeWidth="14" strokeDasharray="11 240" strokeDashoffset="-222" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#94a3b8" strokeWidth="14" strokeDasharray="18 233" strokeDashoffset="-233" />
                  </svg>
                  <div className="donut-center-text">
                    <strong className="donut-val">{currentZone.areaAnalyzed}</strong>
                    <span className="donut-lbl">Total Area</span>
                  </div>
                </div>

                {/* Breakdown Legend */}
                <div className="donut-legend-list">
                  <div className="donut-legend-row">
                    <span className="dot-forest" aria-hidden="true" />
                    <span className="d-label">Forest</span>
                    <strong className="d-pct">{currentZone.distribution.forest}%</strong>
                  </div>
                  <div className="donut-legend-row">
                    <span className="dot-agri" aria-hidden="true" />
                    <span className="d-label">Agriculture</span>
                    <strong className="d-pct">{currentZone.distribution.agriculture}%</strong>
                  </div>
                  <div className="donut-legend-row">
                    <span className="dot-built" aria-hidden="true" />
                    <span className="d-label">Built-up</span>
                    <strong className="d-pct">{currentZone.distribution.builtup}%</strong>
                  </div>
                  <div className="donut-legend-row">
                    <span className="dot-water" aria-hidden="true" />
                    <span className="d-label">Water</span>
                    <strong className="d-pct">{currentZone.distribution.water}%</strong>
                  </div>
                  <div className="donut-legend-row">
                    <span className="dot-bare" aria-hidden="true" />
                    <span className="d-label">Bare Land</span>
                    <strong className="d-pct">{currentZone.distribution.bare}%</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column: Key Metrics, Environmental Insights, Recent Detections */}
        <div className="env-sidebar-right">
          {/* Card 1: Key Metrics (Selected Area) */}
          <section className="env-card" aria-labelledby="metrics-heading">
            <div className="metrics-header-row">
              <h2 id="metrics-heading" className="env-subcard-title no-margin">
                Key Metrics (Selected Area)
              </h2>
              <span className="metrics-timestamp">Generated 01 Jul 2024</span>
            </div>

            <div className="env-metrics-grid">
              {/* Metric 1: Total Area */}
              <div className="env-metric-tile">
                <div className="metric-icon-wrap icon-green-tree" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <polygon points="12 2 2 19 22 19 12 2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
                <div className="metric-info-block">
                  <strong className="env-metric-val">{currentZone.areaAnalyzed}</strong>
                  <span className="env-metric-lbl">Total area analyzed</span>
                </div>
              </div>

              {/* Metric 2: Forest Loss */}
              <div className="env-metric-tile">
                <div className="metric-icon-wrap icon-red-tree" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polygon points="12 2 2 19 22 19 12 2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" strokeWidth="2" />
                  </svg>
                </div>
                <div className="metric-info-block">
                  <strong className="env-metric-val">{currentZone.forestLoss}</strong>
                  <span className="env-metric-lbl">Forest loss detected</span>
                </div>
              </div>

              {/* Metric 3: Cover Change */}
              <div className="env-metric-tile">
                <div className="metric-icon-wrap icon-teal-leaf" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  </svg>
                </div>
                <div className="metric-info-block">
                  <strong className="env-metric-val">{currentZone.forestChange}</strong>
                  <span className="env-metric-lbl">Forest cover change</span>
                </div>
              </div>

              {/* Metric 4: Active Alerts */}
              <div className="env-metric-tile">
                <div className="metric-icon-wrap icon-sprout" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M7 20h10" />
                    <path d="M10 20c0-4 1-6 2-10" />
                    <path d="M12 10c2-3 5-4 7-3-1 3-3 5-7 5" />
                    <path d="M12 14c-2-2-5-3-7-2 1 3 3 4 7 4" />
                  </svg>
                </div>
                <div className="metric-info-block">
                  <strong className="env-metric-val">{currentZone.alertsCount}</strong>
                  <span className="env-metric-lbl">Active alerts</span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Environmental Insights */}
          <section className="env-card" aria-labelledby="insights-heading">
            <div className="insights-header-row">
              <h2 id="insights-heading" className="env-subcard-title no-margin">
                Environmental Insights
              </h2>
              <span className="insights-badge-concern">{currentZone.concern}</span>
            </div>

            <div className="insights-list">
              {/* Insight 1 */}
              <div className="insight-row">
                <div className="insight-icon red-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                    <polyline points="16 17 22 17 22 11" />
                  </svg>
                </div>
                <p className="insight-text">
                  Significant forest cover reduction ({currentZone.forestChange}) in the selected area.
                </p>
              </div>

              {/* Insight 2 */}
              <div className="insight-row">
                <div className="insight-icon red-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M14 2l4 4-9 9H5v-4l9-9z" />
                  </svg>
                </div>
                <p className="insight-text">
                  Possible illegal logging activity detected near river boundary.
                </p>
              </div>

              {/* Insight 3 */}
              <div className="insight-row">
                <div className="insight-icon orange-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                  </svg>
                </div>
                <p className="insight-text">
                  Increased bare land patches compared to last year.
                </p>
              </div>

              {/* Insight 4 */}
              <div className="insight-row">
                <div className="insight-icon cyan-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <p className="insight-text">
                  Recommend on-ground verification and continuous monitoring.
                </p>
              </div>
            </div>
          </section>

          {/* Card 3: Recent Detections */}
          <section className="env-card" aria-labelledby="detections-heading">
            <div className="detections-header-row">
              <h2 id="detections-heading" className="env-subcard-title no-margin">
                Recent Detections
              </h2>
              <button
                type="button"
                className="view-all-link-btn"
                onClick={() => setSelectedDetectionModal(currentZone.detections[0])}
              >
                View All
              </button>
            </div>

            <div className="detections-list">
              {currentZone.detections.map((d) => (
                <div
                  key={d.id}
                  className="detection-item"
                  onClick={() => setSelectedDetectionModal(d)}
                >
                  <img
                    src={d.image}
                    alt={d.title}
                    className="detection-thumb"
                    onError={(e) => {
                      e.currentTarget.src = "/visuals/environment-watch-map.jpg";
                    }}
                  />
                  <div className="detection-info">
                    <strong className="detection-title">{d.title}</strong>
                    <span className="detection-date">{d.areaDate}</span>
                  </div>
                  <span className={`detection-severity-badge badge-${d.severity.toLowerCase()}`}>
                    {d.severity}
                  </span>
                </div>
              ))}
            </div>

            {/* Legal NGT / RTI Petition Export Option */}
            <div className="petition-export-row">
              <button
                type="button"
                className="env-petition-btn"
                onClick={handleExportPetition}
                disabled={!result?.petition_b64}
              >
                Download petition draft data (JSON)
              </button>
            </div>
          </section>
        </div>
      </div>

      {result && (
        <section className="live-result-panel" aria-live="polite" aria-labelledby="environment-live-result">
          <h2 id="environment-live-result">Backend screening result</h2>
          <p className="preview-note">
            The current environmental backend uses generated demonstration imagery and estimates. This is not a real-world change finding.
          </p>
          <div className="live-result-grid">
            <p><strong>Changed area:</strong> {result.area_changed_hectares} ha</p>
            <p><strong>Area change:</strong> {result.change_pct}%</p>
            <p><strong>Detection boxes:</strong> {result.bounding_boxes?.length ?? 0}</p>
          </div>
          <p>{result.ai_narrative}</p>
          <div className="live-result-images">
            {[
              ["Before", result.before_b64],
              ["Change screen", result.diff_b64],
              ["After", result.after_b64],
            ].map(([label, image]) => image && (
              <figure key={label}>
                <img src={`data:image/png;base64,${image}`} alt={`${label} environmental screening image`} />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Details Modal */}
      {selectedDetectionModal && (
        <div className="env-modal-backdrop" onClick={() => setSelectedDetectionModal(null)}>
          <div className="env-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="env-modal-header">
              <h4 className="env-modal-title">{selectedDetectionModal.title}</h4>
              <button
                type="button"
                className="env-modal-close"
                onClick={() => setSelectedDetectionModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <p className="env-modal-meta">
              <strong>Telemetry:</strong> {selectedDetectionModal.areaDate} · <strong>Severity:</strong> {selectedDetectionModal.severity}
            </p>
            <p className="env-modal-body">
              Multi-temporal SAR coherence drop and Sentinel-2 red-edge reflectance shift indicate significant canopy loss. Satellite evidence preserved for National Green Tribunal (NGT) legal filing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
