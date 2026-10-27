import { useState } from "react";
import { aiAnalyze } from "../api/query";
import { printOrSaveAIDossier } from "../utils/pdf";

const EXAMPLE_PROMPTS = [
  {
    title: "Analyze flood impact in Assam between June and July 2024",
    location: "Assam, India",
    startDate: "2024-06-15",
    endDate: "2024-07-07",
    analysisType: "Flood Inundation",
    results: {
      type: "Flood Extent Analysis",
      location: "Assam, India | 15 Jun 2024 – 07 Jul 2024",
      severity: "Moderate Impact",
      area: "28.6 km²",
      villages: 12,
      bridges: 3,
      roads: 5,
      findings: [
        "Flood extent increased by ~28.6 km² in the selected region.",
        "12 villages show potential inundation.",
        "3 critical bridges and 5 road segments are likely affected.",
        "Analysis based on Sentinel-1 SAR (pre and post-event comparison).",
      ],
      beforeDate: "15 Jun 2024",
      afterDate: "07 Jul 2024",
    },
  },
  {
    title: "Compare pre and post images of a lake",
    location: "Sukhna Lake, Chandigarh",
    startDate: "2020-04-01",
    endDate: "2024-04-01",
    analysisType: "Water Body Shrinkage",
    results: {
      type: "Water Body Shrinkage Analysis",
      location: "Chandigarh, India | Apr 2020 – Apr 2024",
      severity: "Critical Deficit",
      area: "4.2 km²",
      villages: 4,
      bridges: 1,
      roads: 2,
      findings: [
        "Lake water spread decreased by 18.5% over the 4-year multi-temporal baseline.",
        "Siltation and perimeter weed growth identified across northern shoreline.",
        "2 critical seasonal inlet channels show significantly reduced inflow telemetry.",
        "Derived via Sentinel-2 NDWI (Normalized Difference Water Index) change detection.",
      ],
      beforeDate: "01 Apr 2020",
      afterDate: "01 Apr 2024",
    },
  },
  {
    title: "Check crop loss in Punjab due to recent drought",
    location: "Ludhiana, Punjab",
    startDate: "2024-05-01",
    endDate: "2024-08-30",
    analysisType: "Crop Health & Drought",
    results: {
      type: "Crop Damage & Drought Assessment",
      location: "Punjab, India | May 2024 – Aug 2024",
      severity: "High Stress",
      area: "42.0 km²",
      villages: 19,
      bridges: 2,
      roads: 8,
      findings: [
        "Sentinel-2 NDVI drop of 68.1% indicates severe agricultural drought stress.",
        "NASA POWER temperature telemetry recorded 41.5°C peak heat anomaly.",
        "19 farming clusters require urgent PMFBY loss compensation claims.",
        "Groundwater depletion detected across tubewell-irrigated rice plots.",
      ],
      beforeDate: "01 May 2024",
      afterDate: "30 Aug 2024",
    },
  },
  {
    title: "Identify illegal mining activity in a specific area",
    location: "Yamuna Riverbed, Panipat",
    startDate: "2021-01-01",
    endDate: "2024-06-01",
    analysisType: "Illegal Mining",
    results: {
      type: "Illegal Sand Mining Detection",
      location: "Haryana / UP Border | Jan 2021 – Jun 2024",
      severity: "Violations Detected",
      area: "8.4 km²",
      villages: 6,
      bridges: 1,
      roads: 4,
      findings: [
        "Unapproved excavation trenches detected outside approved environmental clearance bounds.",
        "14 heavy mechanized extraction pits detected via optical and SAR difference models.",
        "River course alterations observed directly impacting embankment integrity.",
        "Evidence dossier prepared for National Green Tribunal (NGT) complaint.",
      ],
      beforeDate: "15 Jan 2021",
      afterDate: "15 Jun 2024",
    },
  },
  {
    title: "Detect forest change near Chandigarh",
    location: "Morni Hills, Chandigarh",
    startDate: "2022-01-01",
    endDate: "2024-01-01",
    analysisType: "Deforestation",
    results: {
      type: "Canopy Loss & Deforestation Triage",
      location: "Shivalik Foothills | Jan 2022 – Jan 2024",
      severity: "Moderate Loss",
      area: "15.3 km²",
      villages: 7,
      bridges: 0,
      roads: 3,
      findings: [
        "Forest canopy loss of ~15.3 km² identified in reserve forest buffer zones.",
        "Encroachment detected along peripheral road construction corridors.",
        "Multi-spectral NDVI confirms progressive tree felling without replantation.",
        "Actionable geospatial coordinates tagged for State Forest Department action.",
      ],
      beforeDate: "10 Jan 2022",
      afterDate: "10 Jan 2024",
    },
  },
  {
    title: "Analyze urban expansion in a selected region",
    location: "Bengaluru Peripheral Ring",
    startDate: "2019-01-01",
    endDate: "2024-01-01",
    analysisType: "Urban Expansion",
    results: {
      type: "Urban Expansion & Impervious Surface Growth",
      location: "Bengaluru South | Jan 2019 – Jan 2024",
      severity: "Rapid Growth",
      area: "38.2 km²",
      villages: 24,
      bridges: 6,
      roads: 18,
      findings: [
        "38.2 km² converted from agricultural and wetland classifications to concrete infrastructure.",
        "Encroachment onto traditional storm water drain (Rajakaluve) corridors detected.",
        "7 peripheral lake retention basins show critical buffer zone shrinkage.",
        "Sentinel-1 SAR surface roughness shows intense commercial construction.",
      ],
      beforeDate: "15 Jan 2019",
      afterDate: "15 Jan 2024",
    },
  },
];

export default function AIMode({ initialPrompt = "" }) {
  const [prompt, setPrompt] = useState(
    initialPrompt || "Analyze flood impact in Assam between June and July 2024"
  );
  const [location, setLocation] = useState("Assam, India");
  const [startDate, setStartDate] = useState("2024-06-15");
  const [endDate, setEndDate] = useState("2024-07-07");
  const [analysisType, setAnalysisType] = useState("Auto-detect");

  const [activeCenterTab, setActiveCenterTab] = useState("Map View");
  const [splitPos, setSplitPos] = useState(50);
  const [activeResults, setActiveResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0); // 1 to 4
  const [analysisError, setAnalysisError] = useState("");
  const [hasLiveResult, setHasLiveResult] = useState(false);

  const handleSelectExample = (ex) => {
    setPrompt(ex.title);
    setLocation(ex.location);
    setStartDate(ex.startDate);
    setEndDate(ex.endDate);
    setAnalysisType(ex.analysisType);
    setActiveResults(null);
    setProgressStep(0);
    setAnalysisError("");
    setHasLiveResult(false);
  };

  const handleExecuteAI = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setAnalysisError("");
    setActiveResults(null);
    setHasLiveResult(false);
    setProgressStep(1);

    try {
      const payload = {
        prompt: `${prompt.trim()}\nLocation: ${location}.\nRequested observation period: ${startDate} through ${endDate}.\nAnalysis focus: ${analysisType}.`,
      };

      setProgressStep(2);
      const data = await aiAnalyze(payload);
      const output = data.result || {};
      const area = output.affected_area_km2 != null
        ? `${output.affected_area_km2} km²`
        : output.area_changed_hectares != null
          ? `${output.area_changed_hectares} ha`
          : output.ndvi_drop_pct != null
            ? `${output.ndvi_drop_pct}% NDVI change`
            : "Not returned";
      const narrative = data.narrative || "The backend returned no analysis narrative.";
      setProgressStep(3);
      setActiveResults({
        type: data.module_used || data.intent || "Satellite screening",
        location: `${location} | requested ${startDate} to ${endDate}`,
        severity: output.severity_level || output.damage_severity || "Screening result",
        area,
        villages: output.submerged_zones?.length ?? "—",
        bridges: "—",
        roads: output.road_status?.length ?? "—",
        beforeDate: startDate,
        afterDate: endDate,
        findings: [narrative],
      });
      setHasLiveResult(true);
      setProgressStep(4);
    } catch (err) {
      setAnalysisError(err.message || "AI analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!activeResults) return;
    printOrSaveAIDossier({
      prompt,
      location,
      startDate,
      endDate,
      result: {
        module_used: activeResults.type,
        narrative: activeResults.findings.join("\n"),
      },
    });
  };

  return (
    <div className="ai-mode-container" id="main-content">
      {/* Top Header */}
      <header className="ai-page-header">
        <div className="ai-header-left">
          <div className="ai-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>COMPLETE AI MODE</span>
          </div>
          <h1 className="ai-main-title">
            Ask. Analyze. <span className="ai-title-accent">Understand.</span>
          </h1>
          <p className="ai-subtitle">
            Submit a natural-language request to the current backend screening workflows. Verify results before acting on them.
          </p>
        </div>

        {/* Right side floating tags over globe */}
        <div className="ai-header-right" aria-hidden="true">
          <div className="ai-value-pillars">
            <span className="ai-pillar-tag">SCREENING</span>
            <span className="ai-pillar-tag">LIMITATIONS SHOWN</span>
            <span className="ai-pillar-tag">VERIFY RESULTS</span>
          </div>
        </div>
      </header>

      {/* Main 3-Column Dashboard Grid */}
      <div className="ai-dashboard-grid">
        {/* ====================================================================
            COLUMN 1: Your Query & Configuration
            ==================================================================== */}
        <section className="ai-panel ai-query-panel" aria-labelledby="query-title">
          <h2 id="query-title" className="ai-panel-title">
            Your Query
          </h2>

          <form onSubmit={handleExecuteAI} className="ai-query-form">
            <div className="ai-textarea-box">
              <textarea
                className="ai-main-input"
                rows="3"
                maxLength={500}
                placeholder="Describe what you want to analyze..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                aria-label="Your Query Description"
                required
              />
              <span className="ai-char-counter">{prompt.length}/500</span>
            </div>

            {/* Parameter Selectors Row */}
            <div className="ai-params-row">
              <div className="ai-param-item">
                <label className="ai-param-label" htmlFor="param-location">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Location <small>(optional)</small>
                </label>
                <input
                  id="param-location"
                  type="text"
                  className="ai-param-input"
                  placeholder="e.g. Assam, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="ai-param-item">
                <label className="ai-param-label" htmlFor="param-date">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                  </svg>
                  Date range <small>(optional)</small>
                </label>
                <div className="ai-date-picker-wrap">
                  <input
                    id="param-date"
                    type="date"
                    className="ai-param-input date-half"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Start date"
                  />
                  <span className="date-sep">—</span>
                  <input
                    type="date"
                    className="ai-param-input date-half"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="End date"
                  />
                </div>
              </div>
              {analysisError && <p className="live-result-error" role="alert">{analysisError}</p>}
              {!hasLiveResult && (
                <p className="preview-note">
                  Example prompts only populate the request. The current backend screening services may use generated demonstration inputs; verify outputs independently.
                </p>
              )}

              <div className="ai-param-item">
                <label className="ai-param-label" htmlFor="param-analysis-type">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  Analysis type
                </label>
                <div className="ai-select-wrap">
                  <select
                    id="param-analysis-type"
                    className="ai-param-select"
                    value={analysisType}
                    onChange={(e) => setAnalysisType(e.target.value)}
                  >
                    <option value="Auto-detect">Auto-detect</option>
                    <option value="Flood Inundation">Flood Inundation</option>
                    <option value="Crop Health & Drought">Crop Health &amp; Drought</option>
                    <option value="Deforestation">Deforestation</option>
                    <option value="Water Body Shrinkage">Water Body Shrinkage</option>
                    <option value="Illegal Mining">Illegal Mining</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true">⌵</span>
                </div>
              </div>
            </div>

            {/* Action Analyze Button */}
            <button
              type="submit"
              className="ai-analyze-submit-btn"
              disabled={loading}
            >
              <span>{loading ? "Orchestrating Earth AI..." : "Analyze"}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
          </form>

          {/* Example Prompts Grid */}
          <div className="ai-examples-section">
            <div className="ai-section-subtitle-row">
              <span className="ai-section-subtitle">Example prompts</span>
              <button
                type="button"
                className="ai-link-btn"
                onClick={() => handleSelectExample(EXAMPLE_PROMPTS[1])}
              >
                View more
              </button>
            </div>

            <div className="ai-prompts-grid">
              {EXAMPLE_PROMPTS.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() => handleSelectExample(ex)}
                >
                  <span className="prompt-chip-text">{ex.title}</span>
                  <span className="prompt-chip-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data Sources Used Mini Strip */}
          <div className="ai-sources-section">
            <div className="ai-section-subtitle-row">
              <span className="ai-section-subtitle">Data sources used</span>
              <a href="/datasets" className="ai-link-btn">
                View all
              </a>
            </div>

            <div className="ai-sources-cards">
              <div className="ai-source-card">
                <img
                  src="/visuals/cards/ds-sentinel1.jpg"
                  alt="Sentinel-1"
                  className="source-thumb"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="source-info">
                  <strong>Sentinel-1 SAR</strong>
                  <span>Cloud-penetrating radar</span>
                  <div className="source-tags">
                    <span className="source-tag">10 m</span>
                    <span className="source-tag">6-12 days</span>
                  </div>
                </div>
              </div>

              <div className="ai-source-card">
                <img
                  src="/visuals/cards/ds-sentinel2.jpg"
                  alt="Sentinel-2"
                  className="source-thumb"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="source-info">
                  <strong>Sentinel-2</strong>
                  <span>Optical land cover</span>
                  <div className="source-tags">
                    <span className="source-tag">10 m</span>
                    <span className="source-tag">5 days</span>
                  </div>
                </div>
              </div>

              <div className="ai-source-card">
                <img
                  src="/visuals/cards/ds-nasapower.jpg"
                  alt="NASA POWER"
                  className="source-thumb"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="source-info">
                  <strong>NASA POWER</strong>
                  <span>Weather &amp; climate</span>
                  <div className="source-tags">
                    <span className="source-tag">Daily</span>
                    <span className="source-tag">Global</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            COLUMN 2: Center Map & Imagery View
            ==================================================================== */}
        <section className="ai-panel ai-center-panel" aria-label="Satellite Map Viewport">
          {/* Top View Switcher Pills */}
          <div className="ai-view-tabs" role="tablist">
            {["Map View", "Before / After", "Time Series", "Insights"].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={activeCenterTab === t}
                className={`ai-view-tab ${activeCenterTab === t ? "active" : ""}`}
                onClick={() => setActiveCenterTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search bar & Sensor Dropdown */}
          <div className="ai-map-search-bar">
            <div className="search-input-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search location or draw area..."
                className="ai-search-field"
                aria-label="Search map location"
              />
            </div>
            <div className="sensor-dropdown-box">
              <select className="ai-layer-select" aria-label="Satellite Imagery Layer">
                <option value="Satellite Imagery">Satellite Imagery</option>
                <option value="SAR Water Mask">SAR Water Mask</option>
                <option value="NDVI Vegetation">NDVI Vegetation</option>
              </select>
              <span className="select-arrow" aria-hidden="true">⌵</span>
            </div>
          </div>

          {/* Satellite Map Viewport */}
          <div className="ai-map-viewport">
            <img
              src="/visuals/ai-center-map.jpg"
              alt="Assam satellite map overview"
              className="ai-viewport-bg"
              onError={(e) => {
                e.currentTarget.src = "/visuals/flood-split-map.jpg";
              }}
            />

            {/* Left Vertical Map Controls */}
            <div className="map-controls-toolbar" aria-label="Map Controls">
              <button type="button" className="tool-btn" aria-label="Zoom In">+</button>
              <button type="button" className="tool-btn" aria-label="Zoom Out">−</button>
              <button type="button" className="tool-btn" aria-label="Layers">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </button>
              <button type="button" className="tool-btn" aria-label="Recenter">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="7" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
              <button type="button" className="tool-btn" aria-label="Draw Polygon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 3 21 19 12 22 3 19 5 3" />
                </svg>
              </button>
            </div>

            {/* Highlighted Bounding Box / Area of Interest */}
            <div className="ai-aoi-box" aria-label="Monitored Area of Interest">
              <div className="aoi-vertex v-tl" />
              <div className="aoi-vertex v-tr" />
              <div className="aoi-vertex v-bl" />
              <div className="aoi-vertex v-br" />
              <div className="aoi-badge">
                <span className="aoi-label">Analysis Area</span>
                <strong className="aoi-val">{activeResults?.area || "Awaiting analysis"}</strong>
              </div>
            </div>

            {/* Scale Bar */}
            <div className="ai-map-scale-bar">
              <span>10 km</span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            COLUMN 3: Analysis Results
            ==================================================================== */}
        <section className="ai-panel ai-results-panel" aria-labelledby="results-title">
          {/* Card Header with Export Report Button */}
          <div className="results-card-header">
            <h2 id="results-title" className="ai-panel-title">
              Analysis Results
            </h2>
            <button
              type="button"
              className="export-report-btn"
              onClick={handleExportReport}
              disabled={!hasLiveResult}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Report</span>
            </button>
          </div>

          {/* Results Summary & Severity Badge */}
          {activeResults ? (
            <>
          <div className="results-summary-row">
            <div>
              <h3 className="results-event-title">{activeResults.type}</h3>
              <p className="results-event-meta">{activeResults.location}</p>
            </div>
            <span className="severity-badge">{activeResults.severity}</span>
          </div>

          {/* 4 Metric Gauges */}
          <div className="ai-metrics-grid">
            <div className="ai-metric-item">
              <strong className="ai-metric-val">{activeResults.area}</strong>
              <span className="ai-metric-lbl">Returned area / change</span>
            </div>
            <div className="ai-metric-item">
              <strong className="ai-metric-val">{activeResults.villages}</strong>
              <span className="ai-metric-lbl">Returned zones</span>
            </div>
            <div className="ai-metric-item">
              <strong className="ai-metric-val">{activeResults.bridges}</strong>
              <span className="ai-metric-lbl">Bridge count</span>
            </div>
            <div className="ai-metric-item">
              <strong className="ai-metric-val">{activeResults.roads}</strong>
              <span className="ai-metric-lbl">Road features</span>
            </div>
          </div>

          {/* Before vs After Mini Split Comparison */}
          <div className="ai-mini-split-section">
            <span className="mini-split-title">Before vs After</span>
            <div
              className="mini-split-container"
              onMouseMove={(e) => {
                if (e.buttons === 1) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setSplitPos(((e.clientX - rect.left) / rect.width) * 100);
                }
              }}
            >
              <img
                src="/visuals/flood-split-map.jpg"
                alt="Before and after flood comparison"
                className="mini-split-img"
              />
              <div className="mini-split-divider" style={{ left: `${splitPos}%` }}>
                <div className="mini-handle" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="15 18 9 12 15 6" />
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
              <div className="mini-badge-left">Before ({activeResults.beforeDate})</div>
              <div className="mini-badge-right">After ({activeResults.afterDate})</div>
            </div>
          </div>

          {/* Key Findings List */}
          <div className="ai-findings-section">
            <span className="findings-title">Key Findings</span>
            <ul className="findings-list">
              {activeResults.findings.map((finding, idx) => (
                <li key={idx} className="finding-item">
                  <span className="finding-bullet" aria-hidden="true">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
            </>
          ) : (
            <p className="preview-note" role="status">
              No backend result yet. Static map and comparison images are design previews, not evidence returned for this request.
            </p>
          )}
        </section>
      </div>

      {/* ====================================================================
          BOTTOM PROGRESS STEPPER BAR
          ==================================================================== */}
      <section className="ai-progress-bar" aria-label="Analysis Workflow Progress">
        <div className="progress-info-block">
          <strong className="progress-title">Analysis Progress</strong>
          <span className="progress-sub">Your request is being processed using multiple satellite data sources.</span>
        </div>

        <div className="progress-stepper">
          {/* Step 1 */}
          <div className={`step-item ${progressStep >= 1 ? "step-done" : ""}`}>
            <div className="step-icon">
              {progressStep >= 1 ? "✓" : "1"}
            </div>
            <div className="step-text">
              <strong>1. Interpret Query</strong>
              <span>Understanding request</span>
            </div>
          </div>
          <div className={`step-connector ${progressStep >= 2 ? "conn-done" : ""}`} />

          {/* Step 2 */}
          <div className={`step-item ${progressStep >= 2 ? "step-done" : ""}`}>
            <div className="step-icon">
              {progressStep >= 2 ? "✓" : "2"}
            </div>
            <div className="step-text">
              <strong>2. Fetch Data</strong>
              <span>Retrieving satellite imagery</span>
            </div>
          </div>
          <div className={`step-connector ${progressStep >= 3 ? "conn-done" : ""}`} />

          {/* Step 3 */}
          <div className={`step-item ${progressStep >= 3 ? "step-active" : ""}`}>
            <div className="step-icon">
              {progressStep > 3 ? "✓" : "3"}
            </div>
            <div className="step-text">
              <strong>3. Analyze</strong>
              <span>Detecting changes</span>
            </div>
          </div>
          <div className={`step-connector ${progressStep >= 4 ? "conn-done" : ""}`} />

          {/* Step 4 */}
          <div className={`step-item ${progressStep >= 4 ? "step-active" : "step-pending"}`}>
            <div className="step-icon">
              4
            </div>
            <div className="step-text">
              <strong>4. Generate Insights</strong>
              <span>Compiling results</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
