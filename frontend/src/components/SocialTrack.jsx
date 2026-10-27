import { useState } from "react";
import FloodDashboard from "./FloodDashboard";
import CropDamage from "./CropDamage";
import EnvironmentWatch from "./EnvironmentWatch";

const initiatives = [
  {
    id: "flood",
    number: "01",
    title: "Disaster Response & Flood Relief",
    description:
      "Detect flood extent, assess infrastructure impact, and support emergency response.",
    path: "/flood",
    buttonText: "Explore Flood Dispatch",
    image: "/visuals/cards/social-card-flood.jpg",
    features: [
      {
        title: "Flood extent mapping",
        subtext: "Identify inundated areas using SAR data",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        ),
      },
      {
        title: "Infrastructure damage analysis",
        subtext: "Assess impact on roads, bridges and critical assets",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="6" height="6" rx="1" />
            <rect x="16" y="2" width="6" height="6" rx="1" />
            <rect x="9" y="16" width="6" height="6" rx="1" />
            <path d="M5 8v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
            <path d="M12 13v3" />
          </svg>
        ),
      },
      {
        title: "Priority area identification",
        subtext: "Support relief planning and resource allocation",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="10" r="2" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "crop",
    number: "02",
    title: "Agriculture & Rural Welfare",
    description:
      "Verify crop loss, monitor vegetation, and support farmers with objective evidence.",
    path: "/crop-damage",
    buttonText: "Explore Crop Loss Verifier",
    image: "/visuals/cards/social-card-crop.jpg",
    features: [
      {
        title: "Crop damage assessment",
        subtext: "Analyze vegetation health and changes",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 20A7 7 0 0 1 4 13C4 7 11 2 11 2s7 5 7 11a7 7 0 0 1-7 7z" />
            <path d="M11 20v-9" />
          </svg>
        ),
      },
      {
        title: "Historical yield comparison",
        subtext: "Compare with past seasons and regional trends",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        title: "Weather and drought context",
        subtext: "Integrate climate data for better assessment",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        ),
      },
    ],
  },
  {
    id: "environment",
    number: "03",
    title: "Environmental Accountability",
    description:
      "Detect deforestation, illegal mining, and water body shrinkage using multi-temporal satellite data.",
    path: "/environment",
    buttonText: "Explore Environmental Watchdog",
    image: "/visuals/cards/social-card-env.jpg",
    features: [
      {
        title: "Land cover change detection",
        subtext: "Monitor forests, wetlands and water bodies",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L7 9h3v6H8l4 6 4-6h-2V9h3L12 2z" />
          </svg>
        ),
      },
      {
        title: "Illegal activity identification",
        subtext: "Detect encroachment and mining",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
          </svg>
        ),
      },
      {
        title: "Long-term environmental monitoring",
        subtext: "Track changes and support evidence-based action",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        ),
      },
    ],
  },
];

const workspaces = {
  flood: <FloodDashboard />,
  crop: <CropDamage />,
  environment: <EnvironmentWatch />,
};

const metrics = [
  {
    value: "3",
    label: "Screening workflows",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" aria-hidden="true">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    value: "4",
    label: "Supported crop peril types",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    value: "2",
    label: "Satellite mission inputs",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    value: "Telegram",
    label: "Optional claim intake",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
];

export default function SocialTrack({ navigate }) {
  const [activeSection, setActiveSection] = useState(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("section") || null
      : null
  );

  const handleOpen = (e, targetPath, id) => {
    if (navigate) {
      navigate(e, targetPath);
    } else {
      if (e) e.preventDefault();
      setActiveSection(id);
      history.pushState({}, "", targetPath);
    }
  };

  if (activeSection === "flood") {
    return (
      <main className="social-page-shell" id="main-content">
        <div className="social-container">
          <div className="social-section-tabs" role="tablist" aria-label="Social track views">
            <button
              type="button"
              role="tab"
              aria-selected={false}
              className="social-tab-btn"
              onClick={() => setActiveSection(null)}
            >
              ← All Initiatives Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className="social-tab-btn active"
            >
              01 Flood &amp; Infrastructure Triage
            </button>
          </div>
          <FloodDashboard onBack={() => setActiveSection(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="social-page-shell" id="main-content">
      <div className="social-container">
        {/* View Switcher Tabs */}
        <div className="social-section-tabs" role="tablist" aria-label="Social track views">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="social-tab-btn active"
            onClick={() => setActiveSection(null)}
          >
            All Initiatives Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="social-tab-btn"
            onClick={() => setActiveSection("flood")}
          >
            01 Flood &amp; Infrastructure Triage
          </button>
        </div>

        {/* Top Hero Section */}
        <section className="social-hero" aria-labelledby="social-main-title">
          <div className="social-hero-left">
            <div className="social-eyebrow">
              <span className="eyebrow-line" aria-hidden="true" />
              <span>SOCIAL TRACK</span>
            </div>
            <h1 id="social-main-title" className="social-main-title">
              Earth Observation<br />
              <span className="social-title-accent">for Social Impact</span>
            </h1>
            <p className="social-description">
              Turn satellite evidence into actionable insights for disaster response,
              rural welfare, and environmental accountability.
            </p>

            <div className="social-value-props">
              <div className="social-prop-box">
                <span className="social-prop-accent" aria-hidden="true" />
                <div className="social-prop-text">
                  <span className="social-prop-label">Satellite-informed screening</span>
                  <span className="social-prop-sub">Not just maps</span>
                </div>
              </div>
              <div className="social-prop-box">
                <span className="social-prop-accent" aria-hidden="true" />
                <div className="social-prop-text">
                  <span className="social-prop-label">Decision support</span>
                  <span className="social-prop-sub">For communities</span>
                </div>
              </div>
              <div className="social-prop-box">
                <span className="social-prop-accent" aria-hidden="true" />
                <div className="social-prop-text">
                  <span className="social-prop-label">Transparent evidence</span>
                  <span className="social-prop-sub">For accountability</span>
                </div>
              </div>
            </div>
          </div>

          <div className="social-hero-right" aria-hidden="true">
            {/* Floating Live Satellite Region Badge */}
            <div className="social-region-badge">
              <div className="social-region-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="1" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="1" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="23" y2="12" />
                </svg>
              </div>
              <div>
                <div className="social-region-title">India &amp; Surrounding Region</div>
                <div className="social-region-sub">Live satellite perspective</div>
              </div>
            </div>

            {/* Target Reticle Overlay on Earth */}
            <div className="social-target-reticle">
              <div className="reticle-ring reticle-ring-outer" />
              <div className="reticle-ring reticle-ring-inner" />
              <div className="reticle-axis-h" />
              <div className="reticle-axis-v" />
            </div>

            {/* Vertical Theme Categories */}
            <div className="social-theme-pillars">
              <span className="social-theme-tag">DISASTER RESILIENCE</span>
              <span className="social-theme-tag">FOOD SECURITY</span>
              <span className="social-theme-tag">ENVIRONMENTAL JUSTICE</span>
              <span className="social-theme-tag">CIVIC ACCOUNTABILITY</span>
            </div>
          </div>
        </section>

        {/* 3 Main Initiative Cards */}
        <section className="social-cards-grid" aria-label="Social Impact Initiatives">
          {initiatives.map((item) => (
            <article className="social-feature-card" key={item.id}>
              <div className="social-card-media">
                <img
                  src={item.image}
                  alt={`${item.title} satellite view`}
                  loading="lazy"
                  className="social-card-img"
                  onError={(e) => {
                    e.currentTarget.src = "/visuals/cards/social-track.jpg";
                  }}
                />
              </div>

              <div className="social-card-body">
                <div className="social-card-header">
                  <div>
                    <span className="social-card-number">{item.number}</span>
                    <h2 className="social-card-title">{item.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="social-round-arrow-btn"
                    aria-label={`Open ${item.title}`}
                    onClick={(e) => handleOpen(e, item.path, item.id)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>

                <p className="social-card-desc">{item.description}</p>

                <ul className="social-card-features">
                  {item.features.map((feat, idx) => (
                    <li key={idx} className="social-card-feature-item">
                      <div className="social-feat-icon">{feat.icon}</div>
                      <div className="social-feat-info">
                        <strong className="social-feat-title">{feat.title}</strong>
                        <span className="social-feat-sub">{feat.subtext}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="social-card-footer">
                  <a
                    href={item.path}
                    className="social-explore-cta"
                    onClick={(e) => handleOpen(e, item.path, item.id)}
                  >
                    <span>{item.buttonText}</span>
                    <span className="social-cta-arrow" aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Bottom Platform Metrics Strip */}
        <section className="social-metrics-bar" aria-label="Platform reach and data coverage">
          {metrics.map((m, idx) => (
            <div className="social-metric-item" key={idx}>
              <div className="social-metric-icon">{m.icon}</div>
              <div className="social-metric-content">
                <strong className="social-metric-value">{m.value}</strong>
                <span className="social-metric-label">{m.label}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Optional Interactive Live Workspace Drawer/View if selected */}
        {activeSection && activeSection !== "flood" && (
          <section className="social-inline-workspace" aria-label="Selected initiative workspace">
            <div className="social-inline-header">
              <span className="social-eyebrow">LIVE WORKSPACE PREVIEW</span>
              <button
                type="button"
                className="social-close-workspace-btn"
                onClick={() => setActiveSection(null)}
              >
                Close Preview ✕
              </button>
            </div>
            {workspaces[activeSection]}
          </section>
        )}
      </div>
    </main>
  );
}
