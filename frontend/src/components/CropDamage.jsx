import { useState, useRef } from "react";
import { analyzeCropDamage } from "../api/query";

const PRESET_FARMS = [
  {
    name: "Ludhiana, Punjab",
    lat: 30.9010,
    lng: 75.8573,
    crop: "Paddy (Rice)",
    cropValue: "Rice",
    peril: "Monsoon Flood / Inundation",
    perilValue: "flood",
    date: "2024-07-25",
    farmer: "Gurpreet Singh",
    area: "1.8 ha",
    ndviBefore: "0.72",
    ndviAfter: "0.21",
    status: "Likely Affected",
  },
  {
    name: "Vidarbha, Maharashtra",
    lat: 20.9320,
    lng: 77.7523,
    crop: "Cotton",
    cropValue: "Cotton",
    peril: "Severe Drought / Dry Spell",
    perilValue: "drought",
    date: "2024-06-30",
    farmer: "Anand Shinde",
    area: "2.4 ha",
    ndviBefore: "0.68",
    ndviAfter: "0.19",
    status: "Severe Loss",
  },
  {
    name: "Bundelkhand, UP",
    lat: 25.4484,
    lng: 78.5685,
    crop: "Wheat",
    cropValue: "Wheat",
    peril: "Hailstorm / Mechanical Damage",
    perilValue: "hail",
    date: "2024-03-12",
    farmer: "Ram Charan",
    area: "1.5 ha",
    ndviBefore: "0.75",
    ndviAfter: "0.28",
    status: "Likely Affected",
  },
  {
    name: "Rohtas, Bihar",
    lat: 24.9547,
    lng: 84.0150,
    crop: "Paddy (Rice)",
    cropValue: "Rice",
    peril: "Unseasonal Rain & Lodging",
    perilValue: "unseasonal_rain",
    date: "2024-08-20",
    farmer: "Lalit Yadav",
    area: "2.1 ha",
    ndviBefore: "0.70",
    ndviAfter: "0.25",
    status: "Likely Affected",
  },
];

const DAMAGE_LABELS = {
  drought: "Severe Drought / Dry Spell",
  hail: "Hailstorm / Mechanical Damage",
  flood: "Monsoon Flood / Inundation",
  unseasonal_rain: "Unseasonal Rain & Lodging",
};

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

function downloadBase64File(encoded, filename, contentType) {
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CropDamage() {
  const [farmerName, setFarmerName] = useState("Gurpreet Singh");
  const [selectedLocation, setSelectedLocation] = useState(PRESET_FARMS[0].name);
  const [lat, setLat] = useState(30.9010);
  const [lng, setLng] = useState(75.8573);
  const [cropType, setCropType] = useState("Paddy (Rice)");
  const [damageType, setDamageType] = useState("flood");
  const [claimDate, setClaimDate] = useState("2024-07-25");

  const [activeTab, setActiveTab] = useState("change"); // change, split, timeseries, weather
  const [sensor, setSensor] = useState("Sentinel-2 (NDVI)");
  const [splitPos, setSplitPos] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [activeModalData, setActiveModalData] = useState(null);

  const splitRef = useRef(null);
  const telegramUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim();
  const telegramUrl = telegramUsername
    ? `https://t.me/${telegramUsername.replace(/^@/, "")}`
    : null;

  const currentFarm = PRESET_FARMS.find((f) => f.name === selectedLocation) || PRESET_FARMS[0];

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setSelectedLocation(val);
    const found = PRESET_FARMS.find((f) => f.name === val);
    if (found) {
      setLat(found.lat);
      setLng(found.lng);
      setCropType(found.crop);
      setDamageType(found.perilValue);
      setClaimDate(found.date);
      setFarmerName(found.farmer);
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
    setAnalysisError("");
    setResult(null);

    try {
      const data = await analyzeCropDamage({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        crop_type: cropType,
        damage_type: damageType,
        claim_date: claimDate,
        farmer_name: farmerName,
      });
      setResult(data);
    } catch (err) {
      setAnalysisError(err.message || "Crop analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result?.certificate_b64) {
      setAnalysisError("The backend did not return a crop report to download.");
      return;
    }
    downloadBase64File(
      result.certificate_b64,
      "satquery-crop-screening-report.pdf",
      "application/pdf",
    );
  };

  return (
    <div className="crop-loss-page">
      {/* Top Header */}
      <header className="crop-verifier-header">
        <div className="crop-header-left">
          <div className="crop-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>— CROP LOSS VERIFIER</span>
          </div>
          <h1 className="crop-title">
            Zero-Cost <span className="crop-title-accent">Crop Loss &amp; Insurance Verifier</span>
          </h1>
          <p className="crop-subtitle">
            Review vegetation and weather indicators for a reported event. This experimental screening is not an insurance decision.
          </p>
          <p className="preview-note">
            Dashboard imagery and preset values are illustrative; completed backend results appear below the workspace.
          </p>
        </div>

        {/* Top Right Floating Badge */}
        <aside className="crop-farmer-badge" aria-label="Support for Farmers Badge">
          <div className="farmer-badge-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div className="farmer-badge-text">
            <strong className="farmer-badge-title">Support for Farmers</strong>
            <span className="farmer-badge-sub">Satellite evidence for fairer and faster claim assessment.</span>
          </div>
        </aside>
      </header>

      {/* 3-Column Main Grid */}
      <div className="crop-app-grid">
        {/* Left Column: Form Cards */}
        <div className="crop-sidebar-left">
          {/* Card 1: Farmer / Land Information */}
          <section className="crop-card crop-step-card" aria-labelledby="farmer-info-heading">
            <h2 id="farmer-info-heading" className="crop-step-title">
              <span className="step-num-icon" aria-hidden="true">👤</span> 1. Farmer / Land Information
            </h2>

            <div className="crop-input-group">
              <label htmlFor="farmer-name-input" className="crop-input-label">
                Farmer / Landholder Name
              </label>
              <input
                id="farmer-name-input"
                type="text"
                className="crop-text-input"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                placeholder="e.g. Gurpreet Singh"
              />
            </div>

            <div className="crop-input-group">
              <div className="crop-label-split">
                <label htmlFor="location-select" className="crop-input-label">Location</label>
                <span className="crop-helper-link">⟳ Or enter coordinates</span>
              </div>
              <div className="crop-location-row">
                <div className="select-wrap">
                  <select
                    id="location-select"
                    className="param-select"
                    value={selectedLocation}
                    onChange={handleLocationChange}
                  >
                    {PRESET_FARMS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                    <option value="Custom Coordinates">Custom Coordinates</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true">⌵</span>
                </div>

                <div className="coords-inputs-compact">
                  <div className="coord-box-sm">
                    <input
                      type="number"
                      step="0.0001"
                      className="coord-input-sm"
                      value={lat}
                      onChange={(e) => {
                        setLat(e.target.value);
                        setSelectedLocation("Custom Coordinates");
                      }}
                      aria-label="Farm Latitude"
                    />
                    <span className="coord-suffix-sm">°N</span>
                  </div>
                  <div className="coord-box-sm">
                    <input
                      type="number"
                      step="0.0001"
                      className="coord-input-sm"
                      value={lng}
                      onChange={(e) => {
                        setLng(e.target.value);
                        setSelectedLocation("Custom Coordinates");
                      }}
                      aria-label="Farm Longitude"
                    />
                    <span className="coord-suffix-sm">°E</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="crop-input-group">
              <label htmlFor="crop-type-select" className="crop-input-label">
                Crop Type
              </label>
              <div className="select-wrap">
                <select
                  id="crop-type-select"
                  className="param-select"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                >
                  <option value="Paddy (Rice)">Paddy (Rice)</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Sugarcane">Sugarcane</option>
                  <option value="Maize">Maize</option>
                  <option value="Soybean">Soybean</option>
                  <option value="Mustard">Mustard</option>
                  <option value="Pulses / Gram">Pulses / Gram</option>
                </select>
                <span className="select-arrow" aria-hidden="true">⌵</span>
              </div>
            </div>
          </section>

          {/* Card 2: Loss Details */}
          <section className="crop-card crop-step-card" aria-labelledby="loss-details-heading">
            <h2 id="loss-details-heading" className="crop-step-title">
              <span className="step-num-icon" aria-hidden="true">📋</span> 2. Loss Details
            </h2>

            <div className="loss-grid-row">
              <div className="crop-input-group">
                <label htmlFor="peril-select" className="crop-input-label">
                  Reported Peril / Hazard
                </label>
                <div className="select-wrap">
                  <select
                    id="peril-select"
                    className="param-select"
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                  >
                    <option value="flood">Monsoon Flood / Inundation</option>
                    <option value="drought">Severe Drought / Dry Spell</option>
                    <option value="hail">Hailstorm / Mechanical Damage</option>
                    <option value="unseasonal_rain">Unseasonal Rain &amp; Lodging</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true">⌵</span>
                </div>
              </div>

              <div className="crop-input-group">
                <label htmlFor="loss-date-input" className="crop-input-label">
                  Loss Event Date
                </label>
                <div className="date-input-wrap">
                  <input
                    id="loss-date-input"
                    type="date"
                    className="param-date-input"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
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

          </section>

          {/* Card 3: Voice / Telegram Claim (Optional) */}
          <section className="crop-card crop-step-card" aria-labelledby="voice-claim-heading">
            <h2 id="voice-claim-heading" className="crop-step-title">
              <span className="step-num-icon" aria-hidden="true">🎙️</span> 3. Voice / Telegram Claim (Optional)
            </h2>
            <p className="crop-step-subtitle">
              Farmers can share a voice message or Telegram claim for analysis
            </p>

            <div className="voice-buttons-row">
              {telegramUrl ? (
                <a
                  className="voice-action-btn"
                  href={telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                  <span>Send voice claim in Telegram</span>
                </a>
              ) : (
                <p className="preview-note">
                  Set VITE_TELEGRAM_BOT_USERNAME to enable Telegram claim intake.
                </p>
              )}
              {telegramUrl && (
                <a
                  className="voice-action-btn"
                  href={telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                  <span>Open Telegram bot</span>
                </a>
              )}
            </div>
          </section>

          {/* CTA Button */}
          <button
            type="button"
            className="crop-verify-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            <span>{loading ? "Verifying Satellite Canopy..." : "Verify Crop Damage"}</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>

          <p className="cta-helper-text">
            Automatically retrieves satellite data and agro-climatic information. No CSV needed.
          </p>
          {analysisError && <p className="live-result-error" role="alert">{analysisError}</p>}
        </div>

        {/* Center Column: Satellite Analysis, Time Series, Additional Layers */}
        <div className="crop-center-col">
          {/* Main Card: Satellite Analysis Split View */}
          <section className="crop-card crop-main-view-card" aria-label="Satellite Analysis Viewport">
            <div className="crop-view-header">
              <div className="crop-view-header-left">
                <h3 className="crop-view-title">Satellite Analysis</h3>
                <div className="crop-view-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "change"}
                    className={`crop-tab-btn ${activeTab === "change" ? "active" : ""}`}
                    onClick={() => setActiveTab("change")}
                  >
                    Vegetation Change
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "split"}
                    className={`crop-tab-btn ${activeTab === "split" ? "active" : ""}`}
                    onClick={() => setActiveTab("split")}
                  >
                    Before / After
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "timeseries"}
                    className={`crop-tab-btn ${activeTab === "timeseries" ? "active" : ""}`}
                    onClick={() => setActiveTab("timeseries")}
                  >
                    Time Series
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "weather"}
                    className={`crop-tab-btn ${activeTab === "weather" ? "active" : ""}`}
                    onClick={() => setActiveTab("weather")}
                  >
                    Weather Context
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

            {/* Split Comparison Canvas */}
            <div
              className="crop-split-canvas"
              ref={splitRef}
              onMouseMove={(e) => e.buttons === 1 && handleSplitDrag(e)}
              onTouchMove={handleSplitDrag}
            >
              <img
                src="/visuals/crop-loss-split-map.jpg"
                alt="Satellite vegetation before and after loss event"
                className="crop-split-img"
              />

              {/* Split Divider and Handle */}
              <div className="crop-split-divider" style={{ left: `${splitPos}%` }}>
                <div
                  className="crop-split-handle"
                  role="slider"
                  aria-valuenow={splitPos}
                  aria-valuemin={10}
                  aria-valuemax={90}
                  aria-label="Drag slider to compare before and after vegetation"
                  tabIndex={0}
                >
                  ⟷
                </div>
              </div>

              {/* Before Event Badge (Top Left) */}
              <div className="crop-canvas-badge badge-before">
                <span className="badge-event-title">Before Event</span>
                <span className="badge-event-date">10 Jun 2024</span>
              </div>

              {/* After Event Badge (Top Right) */}
              <div className="crop-canvas-badge badge-after">
                <span className="badge-event-title">After Event</span>
                <span className="badge-event-date">05 Aug 2024</span>
              </div>

              {/* Bottom Left: Healthy NDVI Pill */}
              <div className="crop-canvas-ndvi pill-ndvi-healthy">
                <span className="ndvi-val">NDVI: {currentFarm.ndviBefore}</span>
                <span className="ndvi-sub">Healthy vegetation</span>
              </div>

              {/* Bottom Right: Severe Loss NDVI Pill */}
              <div className="crop-canvas-ndvi pill-ndvi-severe">
                <span className="ndvi-val">NDVI: {currentFarm.ndviAfter}</span>
                <span className="ndvi-sub">Severe vegetation loss</span>
              </div>
            </div>
          </section>

          {/* Middle Card: Vegetation Health Time Series (NDVI) */}
          <section className="crop-card crop-timeseries-card" aria-labelledby="timeseries-heading">
            <div className="timeseries-header">
              <h3 id="timeseries-heading" className="crop-subcard-title">
                Vegetation Health Time Series (NDVI)
              </h3>
              <div className="timeseries-legend">
                <div className="ts-legend-item">
                  <span className="ts-dot-green" aria-hidden="true" />
                  <span>Pre-event (Healthy)</span>
                </div>
                <div className="ts-legend-item">
                  <span className="ts-dot-red" aria-hidden="true" />
                  <span>Post-event (Reduced)</span>
                </div>
                <div className="ts-legend-item">
                  <span className="ts-dash-red" aria-hidden="true" />
                  <span>Reported Event Date</span>
                </div>
              </div>
            </div>

            {/* SVG Interactive Time Series Chart */}
            <div className="timeseries-chart-wrap">
              <svg className="timeseries-svg" viewBox="0 0 520 120" preserveAspectRatio="none" aria-label="NDVI canopy health progression curve">
                <defs>
                  <linearGradient id="ndviDropGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis Guides */}
                <line x1="45" y1="20" x2="505" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="45" y1="60" x2="505" y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="45" y1="100" x2="505" y2="100" stroke="rgba(255,255,255,0.12)" />

                {/* Y-axis Labels */}
                <text x="15" y="24" fill="#64748b" fontSize="9" fontFamily="monospace">1.0</text>
                <text x="15" y="64" fill="#64748b" fontSize="9" fontFamily="monospace">0.5</text>
                <text x="15" y="104" fill="#64748b" fontSize="9" fontFamily="monospace">0.0</text>
                <text x="10" y="8" fill="#64748b" fontSize="8" fontFamily="sans-serif">NDVI</text>

                {/* Event Date Vertical Red Line at 25 Jul */}
                <line x1="340" y1="18" x2="340" y2="100" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="4 3" />
                <text x="345" y="14" fill="#ef4444" fontSize="8.5" fontWeight="bold">Event Date</text>
                <text x="345" y="24" fill="#ef4444" fontSize="8">25 Jul 2024</text>

                {/* Pre-event Curve (Green) */}
                <path
                  d="M 50 48 Q 120 40 190 42 T 330 45"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />

                {/* Post-event Drop Curve (Red) */}
                <path
                  d="M 330 45 C 345 50 370 85 410 92 L 485 96"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />

                {/* Pre-event Points (Green) */}
                <circle cx="50" cy="48" r="3.5" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                <circle cx="120" cy="40" r="3.5" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                <circle cx="190" cy="42" r="3.5" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                <circle cx="260" cy="41" r="3.5" fill="#22c55e" stroke="#0a1017" strokeWidth="1.5" />
                <circle cx="330" cy="45" r="4" fill="#4ade80" stroke="#ffffff" strokeWidth="1.5" />

                {/* Post-event Points (Red) */}
                <circle cx="410" cy="92" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="485" cy="96" r="3.5" fill="#ef4444" stroke="#0a1017" strokeWidth="1.5" />
              </svg>

              {/* X-axis Month Marks */}
              <div className="timeseries-xaxis">
                <span>Apr 2024</span>
                <span>May 2024</span>
                <span>Jun 2024</span>
                <span>Jul 2024</span>
                <span>Aug 2024</span>
                <span>Sep 2024</span>
              </div>
            </div>
          </section>

          {/* Bottom Card: Additional Data Layers */}
          <section className="crop-card crop-layers-card" aria-labelledby="layers-heading">
            <h3 id="layers-heading" className="crop-subcard-title">
              Additional Data Layers
            </h3>

            <div className="crop-layers-grid">
              {/* Layer 1: Rainfall */}
              <div className="layer-tile">
                <div className="layer-tile-top">
                  <div className="layer-tile-icon icon-rainfall" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <strong className="layer-tile-title">Rainfall (NASA POWER)</strong>
                </div>
                <p className="layer-tile-desc">Above normal rainfall in July 2024</p>
                <button
                  type="button"
                  className="layer-view-btn"
                  onClick={() => setActiveModalData({ title: "NASA POWER Precipitation", body: "Ludhiana received 184.2 mm cumulative rain in July 2024 (+62% above 10-year mean)." })}
                >
                  View Data
                </button>
              </div>

              {/* Layer 2: Temperature */}
              <div className="layer-tile">
                <div className="layer-tile-top">
                  <div className="layer-tile-icon icon-temp" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2">
                      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                    </svg>
                  </div>
                  <strong className="layer-tile-title">Temperature</strong>
                </div>
                <p className="layer-tile-desc">Normal range</p>
                <button
                  type="button"
                  className="layer-view-btn"
                  onClick={() => setActiveModalData({ title: "Thermal Observation", body: "Mean diurnal temperatures: 28.4°C (Min: 24.1°C, Max: 33.6°C). No acute frost or heatwave stress." })}
                >
                  View Data
                </button>
              </div>

              {/* Layer 3: Soil Moisture */}
              <div className="layer-tile">
                <div className="layer-tile-top">
                  <div className="layer-tile-icon icon-soil" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                  </div>
                  <strong className="layer-tile-title">Soil Moisture</strong>
                </div>
                <p className="layer-tile-desc">High moisture during event</p>
                <button
                  type="button"
                  className="layer-view-btn"
                  onClick={() => setActiveModalData({ title: "SMAP / Sentinel-1 Soil Moisture", body: "Root-zone soil saturation reached 94% between 24-28 July, confirming prolonged root anoxia and waterlogging." })}
                >
                  View Data
                </button>
              </div>

              {/* Layer 4: Field Boundary */}
              <div className="layer-tile">
                <div className="layer-tile-top">
                  <div className="layer-tile-icon icon-boundary" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <strong className="layer-tile-title">Field Boundary</strong>
                </div>
                <p className="layer-tile-desc">{currentFarm.area} (Identified from satellite)</p>
                <button
                  type="button"
                  className="layer-view-btn"
                  onClick={() => setActiveModalData({ title: "Cadastral Plot Telemetry", body: "Automated field parcel segmentation derived from Sentinel-2 edge gradient: 1.8 hectares under continuous cultivation." })}
                >
                  View Data
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Verification Summary, Key Findings, Evidence */}
        <div className="crop-sidebar-right">
          {/* Card 1: Verification Summary */}
          <section className="crop-card" aria-labelledby="summary-heading">
            <div className="summary-header-row">
              <h2 id="summary-heading" className="crop-subcard-title no-margin">
                Verification Summary
              </h2>
              <span className="summary-badge-affected">Likely Affected</span>
            </div>

            <div className="summary-details-list">
              {/* Row 1: Farmer */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Farmer / Landholder</span>
                  <strong className="summary-value">{farmerName}</strong>
                </div>
              </div>

              {/* Row 2: Location */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Location</span>
                  <strong className="summary-value">
                    {selectedLocation} ({parseFloat(lat).toFixed(3)}°N, {parseFloat(lng).toFixed(4)}°E)
                  </strong>
                </div>
              </div>

              {/* Row 3: Crop Type */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Crop Type</span>
                  <strong className="summary-value">{cropType}</strong>
                </div>
              </div>

              {/* Row 4: Reported Peril */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Reported Peril</span>
                  <strong className="summary-value">{DAMAGE_LABELS[damageType] || damageType}</strong>
                </div>
              </div>

              {/* Row 5: Event Date */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Event Date</span>
                  <strong className="summary-value">{formatDateDisplay(claimDate)}</strong>
                </div>
              </div>

              {/* Row 6: Field Area */}
              <div className="summary-item">
                <div className="summary-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <div className="summary-item-content">
                  <span className="summary-label">Field Area (approx.)</span>
                  <strong className="summary-value">{currentFarm.area}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Key Findings */}
          <section className="crop-card" aria-labelledby="findings-heading">
            <h2 id="findings-heading" className="crop-subcard-title">
              Key Findings
            </h2>

            <ul className="crop-findings-list">
              <li className="finding-item">
                <span className="finding-bullet" aria-hidden="true" />
                <span>Significant reduction in vegetation index (NDVI) after the reported event date.</span>
              </li>
              <li className="finding-item">
                <span className="finding-bullet" aria-hidden="true" />
                <span>Field shows signs of inundation consistent with flood conditions.</span>
              </li>
              <li className="finding-item">
                <span className="finding-bullet" aria-hidden="true" />
                <span>Rainfall during the event period was above normal (NASA POWER).</span>
              </li>
              <li className="finding-item">
                <span className="finding-bullet" aria-hidden="true" />
                <span>Satellite evidence supports the reported crop loss.</span>
              </li>
            </ul>
          </section>

          {/* Card 3: Evidence & Data Sources */}
          <section className="crop-card" aria-labelledby="evidence-heading">
            <h2 id="evidence-heading" className="crop-subcard-title">
              Evidence &amp; Data Sources
            </h2>

            <div className="evidence-sources-list">
              {/* Item 1: Sentinel-2 */}
              <div className="evidence-source-item">
                <div className="evidence-icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <div className="evidence-info">
                  <strong className="evidence-name">Sentinel-2</strong>
                  <span className="evidence-desc">Vegetation index (NDVI), optical imagery</span>
                </div>
                <button
                  type="button"
                  className="evidence-view-btn"
                  onClick={() => setActiveModalData({ title: "Sentinel-2 Multi-Spectral Telemetry", body: "Band 8 (NIR) and Band 4 (Red) collected at 10m spatial resolution under ESA Copernicus open data policy." })}
                >
                  View
                </button>
              </div>

              {/* Item 2: NASA POWER */}
              <div className="evidence-source-item">
                <div className="evidence-icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                </div>
                <div className="evidence-info">
                  <strong className="evidence-name">NASA POWER</strong>
                  <span className="evidence-desc">Rainfall, temperature, agro-climatic data</span>
                </div>
                <button
                  type="button"
                  className="evidence-view-btn"
                  onClick={() => setActiveModalData({ title: "NASA POWER Agro-Climatology", body: "NASA Prediction Of Worldwide Energy Resources daily meteorological baseline for agricultural crop loss validation." })}
                >
                  View
                </button>
              </div>

              {/* Item 3: OpenStreetMap */}
              <div className="evidence-source-item">
                <div className="evidence-icon-wrap" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </div>
                <div className="evidence-info">
                  <strong className="evidence-name">OpenStreetMap</strong>
                  <span className="evidence-desc">Field boundaries, roads, nearby infrastructure</span>
                </div>
                <button
                  type="button"
                  className="evidence-view-btn"
                  onClick={() => setActiveModalData({ title: "OpenStreetMap Infrastructure Layer", body: "Rural road access network and water drainage channels georeferenced for farm parcel boundary grounding." })}
                >
                  View
                </button>
              </div>
            </div>

            {/* PMFBY PDF Certificate Download Option */}
            <div className="pdf-export-row">
              <button
                type="button"
                className="crop-pdf-btn"
                onClick={handleDownloadPDF}
                disabled={!result?.certificate_b64}
              >
                Download screening report (PDF)
              </button>
            </div>
          </section>
        </div>
      </div>

      {result && (
        <section className="live-result-panel" aria-live="polite" aria-labelledby="crop-live-result">
          <h2 id="crop-live-result">Backend screening result</h2>
          <p className="preview-note">Informational screening only; not an insurance decision.</p>
          <div className="live-result-grid">
            <p><strong>NDVI before:</strong> {Number(result.ndvi_before).toFixed(2)}</p>
            <p><strong>NDVI after:</strong> {Number(result.ndvi_after).toFixed(2)}</p>
            <p><strong>NDVI change:</strong> {result.ndvi_drop_pct}%</p>
            <p><strong>Screening classification:</strong> {result.damage_severity}</p>
            <p><strong>Rainfall:</strong> {result.weather_data?.total_rainfall_mm ?? "Not returned"} mm</p>
            <p><strong>Peak temperature:</strong> {result.weather_data?.peak_temperature_c ?? "Not returned"} °C</p>
          </div>
          <p>{result.ai_assessment}</p>
        </section>
      )}

      {/* Info Modal / Drawer */}
      {activeModalData && (
        <div className="crop-modal-backdrop" onClick={() => setActiveModalData(null)}>
          <div className="crop-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="crop-modal-header">
              <h4 className="crop-modal-title">{activeModalData.title}</h4>
              <button
                type="button"
                className="crop-modal-close"
                onClick={() => setActiveModalData(null)}
                aria-label="Close details modal"
              >
                ✕
              </button>
            </div>
            <p className="crop-modal-body">{activeModalData.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
