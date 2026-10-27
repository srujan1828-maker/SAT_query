import { useEffect, useRef, useState } from "react";

const features = [
  ["01", "✨ Complete AI Mode", "/ai", "Ask anything with only a prompt. Autonomously analyze any area for change, flood triage, crop loss, or environmental watchdog with zero manual configuration."],
  ["02", "🚨 Flood & Infrastructure Dispatch", "/flood", "Cloud-penetrating SAR radar backscatter triage, submerged village detection, and high-ground safe evacuation routing for NDRF boats."],
  ["03", "🌾 Zero-Cost Crop Loss Verifier", "/crop-damage", "Autonomous internet crop yield scraping, Sentinel-2 NDVI canopy decline verification, and instant PMFBY insurance damage certificates."],
  ["04", "🌳 Environmental Justice Watchdog", "/environment", "Multi-temporal change detection quantifying exact hectares lost to illegal mining, deforestation, or lake shrinkage with court-ready NGT & RTI petitions."],
];

export default function Landing({ navigate }) {
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState(false);
  const video = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (reduced?.matches) video.current?.pause();
      else video.current?.play()?.catch(() => {});
    };
    update();
    reduced?.addEventListener("change", update);
    return () => reduced?.removeEventListener("change", update);
  }, []);

  return (
    <main id="main-content" className="landing">
      <section className="earth-hero" aria-labelledby="hero-title">
        <video
          ref={video}
          className="earth-video"
          loop
          muted
          playsInline
          preload="none"
          poster="/visuals/earth-hero.jpg"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-hidden="true"
        >
          <source src="/visuals/earth-hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">A NEW PERSPECTIVE ON OUR PLANET</p>
          <h1 id="hero-title">
            Earth Intelligence,<br />
            <span>Made Queryable.</span>
          </h1>
          <p className="hero-sub">Ask questions. Discover patterns. Understand our planet.</p>
          <form
            className="hero-query"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(e, "/ai", query.trim());
            }}
          >
            <label className="sr-only" htmlFor="earth-question">Your satellite question</label>
            <input
              id="earth-question"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={2000}
              placeholder="Ask anything... e.g. 'Analyse Sukhna lake shrinkage' or 'Assam flood damage'"
            />
            <button className="primary" type="submit" aria-label="Open AI analysis with this question">
              ✨ AI Analyze →
            </button>
          </form>
          <p className="examples-label">CHOOSE YOUR STARTING POINT</p>
          <div className="hero-chips">
            <a href="/ai" onClick={(e) => navigate(e, "/ai")}>✨ Complete AI Mode ↗</a>
            <a href="/flood" onClick={(e) => navigate(e, "/flood")}>🚨 Emergency Flood Dispatch ↗</a>
            <a href="/crop-damage" onClick={(e) => navigate(e, "/crop-damage")}>🌾 Crop Loss &amp; PMFBY ↗</a>
            <a href="/environment" onClick={(e) => navigate(e, "/environment")}>🌳 Environmental Watchdog ↗</a>
          </div>
        </div>
        <div className="hero-bottom">
          <div>
            <strong>Sentinel-1 SAR</strong>
            <span>Cloud-penetrating radar</span>
          </div>
          <div>
            <strong>Sentinel-2 &amp; NDVI</strong>
            <span>10m optical canopy telemetry</span>
          </div>
          <div>
            <strong>NASA POWER</strong>
            <span>Daily agro-climatology</span>
          </div>
          <button
            className="video-toggle"
            onClick={() => {
              if (playing) video.current.pause();
              else video.current?.play()?.catch(() => {});
            }}
          >
            {playing ? "Pause background" : "Play background"}
          </button>
        </div>
      </section>

      <section className="explore-section" aria-labelledby="explore-title">
        <p className="eyebrow">YOUR EARTH OBSERVATION WORKSPACE</p>
        <h2 id="explore-title">What would you like to explore?</h2>
        <p className="muted">Focused tools. Real observations. Actionable civic outcomes.</p>
        <div className="feature-grid">
          {features.map(([number, name, path, description]) => (
            <a
              key={path}
              className="feature-tile"
              href={path}
              onClick={(e) => navigate(e, path)}
            >
              <span className="tile-number">{number} /</span>
              <h3>
                {name} <span aria-hidden="true">↗</span>
              </h3>
              <p>{description}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
