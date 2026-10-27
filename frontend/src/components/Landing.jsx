import { useState } from "react";

export default function Landing({ navigate }) {
  const [query, setQuery] = useState("");

  const handleSearch = (e, q) => {
    if (e) e.preventDefault();
    const targetQ = q !== undefined ? q : query;
    navigate(e, "/ai", targetQ.trim());
  };

  const featureCards = [
    {
      title: "Social Track",
      desc: "Civic impact insights",
      path: "/social-track",
      img: "/visuals/cards/social-track.jpg",
    },
    {
      title: "Complete AI Mode",
      desc: "Natural language analysis",
      path: "/ai",
      img: "/visuals/cards/ai-mode.jpg",
    },
    {
      title: "Flood Dispatch",
      desc: "Disaster response & relief",
      path: "/flood",
      img: "/visuals/cards/flood-dispatch.jpg",
    },
    {
      title: "Crop Loss Verifier",
      desc: "Agriculture & rural welfare",
      path: "/crop-damage",
      img: "/visuals/cards/crop-damage.jpg",
    },
    {
      title: "Environmental Watchdog",
      desc: "Deforestation, mining & water",
      path: "/environment",
      img: "/visuals/cards/environment.jpg",
    },
  ];

  const examples = [
    "Analyze flood impact in Assam (June–July 2024)",
    "Check crop loss in Punjab",
    "Detect forest change near Chandigarh",
  ];

  return (
    <main id="main-content" className="home-main">
      <div className="home-container">
        {/* Hero Section */}
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-content">
            <div className="home-eyebrow">
              <span className="eyebrow-line" aria-hidden="true" />
              <span>SATELLITE EVIDENCE. REAL-WORLD IMPACT.</span>
            </div>

            <h1 id="hero-title" className="home-title">
              Earth Intelligence,<br />
              <span className="text-green">Made Queryable.</span>
            </h1>

            <p className="home-sub">
              Ask questions. Discover patterns. Track change. Turn satellite data into actionable insights for a safer, fairer and more sustainable planet.
            </p>

            <form className="home-search-bar" onSubmit={(e) => handleSearch(e)}>
              <div className="search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <label className="sr-only" htmlFor="earth-question">
                Your satellite question
              </label>
              <input
                id="earth-question"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={2000}
                placeholder="Ask anything about our planet..."
              />
              <button
                type="submit"
                className="btn-analyze"
                aria-label="Open AI analysis with this question"
              >
                Analyze →
              </button>
            </form>

            <div className="home-examples">
              <span className="examples-tag">Try an example:</span>
              <div className="examples-list">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    className="example-pill"
                    onClick={(e) => handleSearch(e, ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Floating Indicators on Globe */}
          <div className="hero-globe-overlays" aria-hidden="true">
            <div className="globe-tagline">
              <span>Real Data</span>
              <span>Real Insights</span>
              <span>Real Impact</span>
            </div>

            <div className="globe-reticle">
              <div className="reticle-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5FE38A" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div className="reticle-coords">
                <span>28.6139° N</span>
                <span>77.2090° E</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5 Feature Cards */}
        <section className="home-cards-grid" aria-label="Feature modules">
          {featureCards.map((card) => (
            <a
              key={card.path}
              href={card.path}
              className="module-card-tile"
              style={{ backgroundImage: `url(${card.img})` }}
              onClick={(e) => navigate(e, card.path)}
            >
              <div className="module-card-overlay" />
              <div className="module-card-text">
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
              <div className="module-card-arrow" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </a>
          ))}
        </section>

        {/* Bottom Data Sources Bar */}
        <section className="data-sources-bar" aria-label="Data sources summary">
          <div className="ds-header">OUR DATA SOURCES</div>
          <div className="ds-content">
            <div className="ds-sources-row">
              <div className="ds-item">
                <img src="/visuals/cards/ds-sentinel1.jpg" alt="" className="ds-thumb" />
                <div className="ds-info">
                  <h4>Sentinel-1 SAR</h4>
                  <p>Cloud-penetrating radar</p>
                  <div className="ds-tags">
                    <span>10 m</span>
                    <span>6–12 days</span>
                    <span>All-weather</span>
                  </div>
                </div>
              </div>

              <div className="ds-item">
                <img src="/visuals/cards/ds-sentinel2.jpg" alt="" className="ds-thumb" />
                <div className="ds-info">
                  <h4>Sentinel-2</h4>
                  <p>Optical land cover</p>
                  <div className="ds-tags">
                    <span>10 m</span>
                    <span>5 days</span>
                    <span>Vegetation &amp; water</span>
                  </div>
                </div>
              </div>

              <div className="ds-item">
                <img src="/visuals/cards/ds-nasapower.jpg" alt="" className="ds-thumb" />
                <div className="ds-info">
                  <h4>NASA POWER</h4>
                  <p>Weather &amp; climate data</p>
                  <div className="ds-tags">
                    <span>Daily</span>
                    <span>Global</span>
                    <span>Agro-climatology</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ds-stats-row">
              <div className="stat-col">
                <strong>250M+</strong>
                <span>km² analyzed</span>
              </div>
              <div className="stat-divider" aria-hidden="true" />
              <div className="stat-col">
                <strong>50+</strong>
                <span>countries covered</span>
              </div>
              <div className="stat-divider" aria-hidden="true" />
              <div className="stat-col">
                <strong className="stat-accent">24/7</strong>
                <span>global monitoring</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
