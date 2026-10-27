import { useState, useMemo } from "react";

const DATASETS = [
  {
    id: "sentinel-1",
    title: "Sentinel-1 SAR",
    category: "Satellite Imagery",
    categoryKey: "imagery",
    badgeType: "imagery",
    access: "Free & Open",
    accessKey: "free",
    resolution: "10 m",
    image: "/visuals/datasets/sentinel1.jpg",
    description: "C-band SAR imagery for all-weather, cloud-penetrating analysis.",
    tags: ["Flood Mapping", "Land Change"],
    url: "https://planetarycomputer.microsoft.com/dataset/sentinel-1-rtc",
  },
  {
    id: "sentinel-2",
    title: "Sentinel-2",
    category: "Satellite Imagery",
    categoryKey: "imagery",
    badgeType: "imagery",
    access: "Free & Open",
    accessKey: "free",
    resolution: "10 m",
    image: "/visuals/datasets/sentinel2.jpg",
    description: "High-resolution optical imagery for vegetation, land use and water body analysis.",
    tags: ["Vegetation", "Land Cover"],
    url: "https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a",
  },
  {
    id: "nasa-power",
    title: "NASA POWER",
    category: "Weather Data",
    categoryKey: "weather",
    badgeType: "weather",
    access: "Free & Open",
    accessKey: "free",
    resolution: "Global",
    image: "/visuals/datasets/nasapower.jpg",
    description: "Historical and real-time meteorological data (rainfall, temperature, humidity, solar radiation).",
    tags: ["Weather", "Climate"],
    url: "https://power.larc.nasa.gov/",
  },
  {
    id: "osm",
    title: "OpenStreetMap",
    category: "Geospatial Data",
    categoryKey: "geospatial",
    badgeType: "geospatial",
    access: "Free & Open",
    accessKey: "free",
    resolution: "Global",
    image: "/visuals/datasets/osm.jpg",
    description: "Global map data for roads, settlements, and infrastructure.",
    tags: ["Roads", "Settlements"],
    url: "https://www.openstreetmap.org/",
  },
  {
    id: "gpm",
    title: "GPM IMERG",
    category: "Weather Data",
    categoryKey: "weather",
    badgeType: "weather",
    access: "Free & Open",
    accessKey: "free",
    resolution: "0.1°",
    image: "/visuals/datasets/gpm.jpg",
    description: "Global rainfall measurements from satellite observations.",
    tags: ["Precipitation", "Weather"],
    url: "https://gpm.nasa.gov/data/imerg",
  },
  {
    id: "srtm",
    title: "SRTM DEM",
    category: "Geospatial Data",
    categoryKey: "geospatial",
    badgeType: "geospatial",
    access: "Free & Open",
    accessKey: "free",
    resolution: "30 m",
    image: "/visuals/datasets/srtm.jpg",
    description: "Global digital elevation model for terrain and slope analysis.",
    tags: ["Elevation", "Terrain"],
    url: "https://planetarycomputer.microsoft.com/dataset/nasadem",
  },
  {
    id: "viirs",
    title: "VIIRS Night Lights",
    category: "Auxiliary Data",
    categoryKey: "auxiliary",
    badgeType: "auxiliary",
    access: "Free & Open",
    accessKey: "free",
    resolution: "500 m",
    image: "/visuals/datasets/viirs.jpg",
    description: "Night-time light data for infrastructure and human activity analysis.",
    tags: ["Human Activity", "Infrastructure"],
    url: "https://eogdata.mines.edu/products/vnl/",
  },
  {
    id: "worldpop",
    title: "WorldPop",
    category: "Infrastructure",
    categoryKey: "infrastructure",
    badgeType: "infrastructure",
    access: "Free & Open",
    accessKey: "free",
    resolution: "100 m",
    image: "/visuals/datasets/worldpop.jpg",
    description: "Population data for vulnerability and risk assessment.",
    tags: ["Population", "Demographics"],
    url: "https://www.worldpop.org/",
  },
];

const CATEGORIES = [
  { key: "all", label: "All Sources", icon: "🌐", count: 8 },
  { key: "imagery", label: "Satellite Imagery", icon: "🛰️", count: 3 },
  { key: "weather", label: "Weather & Climate", icon: "☁️", count: 2 },
  { key: "geospatial", label: "Geospatial Data", icon: "🗺️", count: 2 },
  { key: "infrastructure", label: "Infrastructure & Maps", icon: "🏙️", count: 1 },
  { key: "auxiliary", label: "Auxiliary Data", icon: "📊", count: 1 },
];

export default function DataSources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [accessFilter, setAccessFilter] = useState({
    free: true,
    account: true,
    commercial: false,
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestedDatasetName, setRequestedDatasetName] = useState("");

  const filteredDatasets = useMemo(() => {
    return DATASETS.filter((d) => {
      // Category filter
      if (selectedCategory !== "all" && d.categoryKey !== selectedCategory) {
        return false;
      }
      // Access filter
      if (!accessFilter.free && d.accessKey === "free") return false;
      if (!accessFilter.account && d.accessKey === "account") return false;
      if (!accessFilter.commercial && d.accessKey === "commercial") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesDesc = d.description.toLowerCase().includes(q);
        const matchesCategory = d.category.toLowerCase().includes(q);
        const matchesTags = d.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesTags) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "resolution") return a.resolution.localeCompare(b.resolution);
      return 0; // relevance
    });
  }, [searchQuery, selectedCategory, accessFilter, sortBy]);

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setShowRequestModal(false);
      setRequestedDatasetName("");
    }, 1800);
  };

  return (
    <div className="sources-directory-page">
      {/* Top Header */}
      <header className="sources-hero-header">
        <div className="sources-header-left">
          <div className="sources-eyebrow">
            <span className="eyebrow-line" aria-hidden="true" />
            <span>— DATA SOURCES</span>
          </div>
          <h1 className="sources-title">
            Trusted Data. <span className="sources-title-accent">Real Impact.</span>
          </h1>
          <p className="sources-subtitle">
            Explore the satellite data, geospatial layers, and auxiliary datasets that power SatQuery.
          </p>
        </div>

        {/* Top Right Floating Badge */}
        <aside className="sources-hero-badge" aria-label="Multi-Source Intelligence">
          <div className="hero-badge-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="hero-badge-text">
            <strong className="hero-badge-title">Multi-Source Intelligence</strong>
            <span className="hero-badge-sub">Combining satellite, meteorological and geospatial data for accurate, actionable insights.</span>
          </div>
        </aside>
      </header>

      {/* Top Stats Ribbon (5 Items) */}
      <section className="sources-stats-ribbon" aria-label="Overview Metrics">
        <div className="ribbon-item">
          <div className="ribbon-icon green-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div className="ribbon-text">
            <strong className="ribbon-val">8+</strong>
            <span className="ribbon-lbl">Data Sources</span>
          </div>
        </div>

        <div className="ribbon-item">
          <div className="ribbon-icon blue-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="ribbon-text">
            <strong className="ribbon-val">Satellite Imagery</strong>
            <span className="ribbon-lbl">Optical &amp; Radar</span>
          </div>
        </div>

        <div className="ribbon-item">
          <div className="ribbon-icon cyan-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          </div>
          <div className="ribbon-text">
            <strong className="ribbon-val">Weather Data</strong>
            <span className="ribbon-lbl">Real-time &amp; Historical</span>
          </div>
        </div>

        <div className="ribbon-item">
          <div className="ribbon-icon purple-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="ribbon-text">
            <strong className="ribbon-val">Geospatial Layers</strong>
            <span className="ribbon-lbl">Terrain, Land Use, Infrastructure</span>
          </div>
        </div>

        <div className="ribbon-item">
          <div className="ribbon-icon teal-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div className="ribbon-text">
            <strong className="ribbon-val">Open Data</strong>
            <span className="ribbon-lbl">Global &amp; Regional</span>
          </div>
        </div>
      </section>

      {/* Main 3-Column Content Layout */}
      <div className="sources-main-layout">
        {/* Left Sidebar: Filters */}
        <aside className="sources-sidebar-filters" aria-label="Dataset Filters">
          {/* Search Box */}
          <div className="sources-search-box">
            <svg className="search-box-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sources-search-input"
              placeholder="Search data sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search data sources"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter by Category */}
          <div className="filter-group">
            <h3 className="filter-group-title">Filter by Category</h3>
            <div className="filter-options-list" role="radiogroup" aria-label="Filter by Category">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`filter-radio-row ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.key)}
                  >
                    <span className="radio-dot-indicator" aria-hidden="true" />
                    <span className="filter-label-text">{cat.label}</span>
                    <span className="filter-count-badge">{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter by Access */}
          <div className="filter-group">
            <h3 className="filter-group-title">Filter by Access</h3>
            <div className="filter-options-list">
              <label className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={accessFilter.free}
                  onChange={(e) => setAccessFilter({ ...accessFilter, free: e.target.checked })}
                />
                <span className="checkbox-custom" aria-hidden="true" />
                <span className="filter-label-text">Free &amp; Open</span>
                <span className="filter-count-badge">6</span>
              </label>

              <label className="filter-checkbox-row">
                <input
                  type="checkbox"
                  checked={accessFilter.account}
                  onChange={(e) => setAccessFilter({ ...accessFilter, account: e.target.checked })}
                />
                <span className="checkbox-custom" aria-hidden="true" />
                <span className="filter-label-text">Requires Account</span>
                <span className="filter-count-badge">2</span>
              </label>

              <label className="filter-checkbox-row disabled">
                <input
                  type="checkbox"
                  checked={accessFilter.commercial}
                  onChange={(e) => setAccessFilter({ ...accessFilter, commercial: e.target.checked })}
                />
                <span className="checkbox-custom" aria-hidden="true" />
                <span className="filter-label-text">Commercial</span>
                <span className="filter-count-badge">0</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Center Main Directory: Grid of Datasets */}
        <section className="sources-catalog-section" aria-labelledby="catalog-heading">
          {/* Top Bar with Count & Sort Controls */}
          <div className="catalog-top-bar">
            <h2 id="catalog-heading" className="catalog-title">
              Data Sources <span className="catalog-count">({filteredDatasets.length})</span>
            </h2>

            <div className="catalog-controls">
              <div className="sort-wrap">
                <span className="sort-prefix">Sort by:</span>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort datasets"
                >
                  <option value="relevance">Relevance</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="resolution">Resolution</option>
                </select>
                <span className="sort-arrow" aria-hidden="true">⌵</span>
              </div>

              <div className="view-mode-toggle" role="group" aria-label="Catalog View Mode">
                <button
                  type="button"
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Cards */}
          <div className={`datasets-grid ${viewMode === "list" ? "as-list" : ""}`}>
            {filteredDatasets.map((ds) => (
              <article key={ds.id} className="dataset-card">
                {/* Thumbnail Header */}
                <div className="dataset-thumb-wrap">
                  <img
                    src={ds.image}
                    alt={ds.title}
                    className="dataset-thumb-img"
                    onError={(e) => {
                      e.currentTarget.src = "/visuals/cards/flood-dispatch.jpg";
                    }}
                  />
                  <span className={`dataset-cat-badge badge-${ds.badgeType}`}>
                    {ds.category}
                  </span>
                </div>

                {/* Content */}
                <div className="dataset-card-body">
                  <h3 className="dataset-title">{ds.title}</h3>
                  <p className="dataset-desc">{ds.description}</p>

                  {/* Tags */}
                  <div className="dataset-tags-row">
                    {ds.tags.map((tag) => (
                      <span key={tag} className="dataset-tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer Meta */}
                  <div className="dataset-footer">
                    <div className="dataset-meta-specs">
                      <span className="spec-item">
                        <span className="spec-dot" aria-hidden="true">◇</span>
                        <span>{ds.access}</span>
                      </span>
                      <span className="spec-item">
                        <span className="spec-dot" aria-hidden="true">⊙</span>
                        <span>{ds.resolution}</span>
                      </span>
                    </div>

                    <a
                      href={ds.url}
                      target="_blank"
                      rel="noreferrer"
                      className="dataset-ext-link"
                      aria-label={`Open documentation for ${ds.title}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
            ))}

            {filteredDatasets.length === 0 && (
              <div className="no-datasets-found">
                <p>No data sources match your filter criteria.</p>
                <button
                  type="button"
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setAccessFilter({ free: true, account: true, commercial: true });
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar: Coverage & Usage Stats */}
        <aside className="sources-sidebar-info" aria-label="Data Coverage and Usage">
          {/* Card 1: Data Coverage */}
          <div className="sources-info-card">
            <div className="info-card-header">
              <h3 className="info-card-title">Data Coverage</h3>
              <span className="info-help-icon" title="Global Coverage" aria-hidden="true">ⓘ</span>
            </div>

            <div className="coverage-map-wrap">
              <img
                src="/visuals/datasets/coverage-map.jpg"
                alt="Global geographic coverage map"
                className="coverage-map-img"
              />
            </div>

            <div className="coverage-stats-list">
              <div className="coverage-row">
                <span className="cov-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Temporal Range
                </span>
                <strong className="cov-value">Daily – Multi-Decadal</strong>
              </div>

              <div className="coverage-row">
                <span className="cov-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  Spatial Resolution
                </span>
                <strong className="cov-value">10 m – 1 Peer</strong>
              </div>

              <div className="coverage-row">
                <span className="cov-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Update Frequency
                </span>
                <strong className="cov-value">Daily – Monthly</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Data Usage Donut */}
          <div className="sources-info-card">
            <h3 className="info-card-title">Data Usage</h3>

            <div className="usage-donut-row">
              <div className="donut-wrap-sm">
                <svg width="78" height="78" viewBox="0 0 100 100" className="donut-svg">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22c55e" strokeWidth="15" strokeDasharray="94 157" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#38bdf8" strokeWidth="15" strokeDasharray="63 188" strokeDashoffset="-94" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#c084fc" strokeWidth="15" strokeDasharray="63 188" strokeDashoffset="-157" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="15" strokeDasharray="31 220" strokeDashoffset="-220" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="15" strokeDasharray="31 220" strokeDashoffset="-251" />
                </svg>
                <div className="donut-center-lbl">
                  <strong>8</strong>
                  <span>Sources</span>
                </div>
              </div>

              <div className="usage-legend-list">
                <div className="usage-legend-row">
                  <span className="dot-green" aria-hidden="true" />
                  <span className="u-label">Satellite Imagery</span>
                  <span className="u-val">3</span>
                </div>
                <div className="usage-legend-row">
                  <span className="dot-blue" aria-hidden="true" />
                  <span className="u-label">Weather &amp; Climate</span>
                  <span className="u-val">2</span>
                </div>
                <div className="usage-legend-row">
                  <span className="dot-teal" aria-hidden="true" />
                  <span className="u-label">Geospatial Data</span>
                  <span className="u-val">2</span>
                </div>
                <div className="usage-legend-row">
                  <span className="dot-purple" aria-hidden="true" />
                  <span className="u-label">Infrastructure</span>
                  <span className="u-val">1</span>
                </div>
                <div className="usage-legend-row">
                  <span className="dot-orange" aria-hidden="true" />
                  <span className="u-label">Auxiliary Data</span>
                  <span className="u-val">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Need a Custom Dataset */}
          <div className="sources-info-card custom-dataset-card">
            <div className="custom-dataset-top">
              <div className="custom-db-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div className="custom-dataset-text">
                <h4 className="custom-dataset-title">Need a Custom Dataset?</h4>
                <p className="custom-dataset-desc">
                  Request additional data sources for your specific use case.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="request-dataset-btn"
              onClick={() => setShowRequestModal(true)}
            >
              Request Data
            </button>
          </div>
        </aside>
      </div>

      {/* Modal for Requesting a Dataset */}
      {showRequestModal && (
        <div className="dataset-modal-backdrop" onClick={() => setShowRequestModal(false)}>
          <div className="dataset-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dataset-modal-header">
              <h4 className="modal-heading">Request a Custom Dataset</h4>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowRequestModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {requestSubmitted ? (
              <div className="request-success-box">
                <span className="success-icon">✓</span>
                <p>Thank you! Your request for &quot;{requestedDatasetName || "Custom Dataset"}&quot; has been submitted to the SatQuery data ingestion team.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="request-form">
                <label className="modal-input-label">
                  Dataset Name or Portal URL
                  <input
                    type="text"
                    required
                    className="modal-text-input"
                    placeholder="e.g. Landsat 9, MODIS Fire, Copernicus DEM"
                    value={requestedDatasetName}
                    onChange={(e) => setRequestedDatasetName(e.target.value)}
                  />
                </label>

                <label className="modal-input-label">
                  Intended Application / Use Case
                  <textarea
                    rows="3"
                    className="modal-textarea"
                    placeholder="e.g. Drought monitoring in drylands, coastal erosion tracking..."
                  />
                </label>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowRequestModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="modal-submit-btn">
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
