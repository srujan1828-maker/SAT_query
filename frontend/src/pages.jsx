import { useEffect, useState, useRef } from "react";
import SatelliteQuery from "./App";
import Landing from "./components/Landing";
import DataSources from "./components/DataSources";
import AIMode from "./components/AIMode";
import FloodDashboard from "./components/FloodDashboard";
import CropDamage from "./components/CropDamage";
import EnvironmentWatch from "./components/EnvironmentWatch";
import SocialTrack from "./components/SocialTrack";
import "./design.css";

const pages = [
  { path: "/query", label: "Satellite Query", mode: "query" },
  { path: "/social-track", label: "Social Track", mode: "social" },
  { path: "/ai", label: "Complete AI Mode", mode: "ai" },
  { path: "/flood", label: "Flood Dispatch", mode: "flood" },
  { path: "/crop-damage", label: "Crop Loss Verifier", mode: "crop" },
  { path: "/environment", label: "Environmental Watchdog", mode: "environment" },
];

export default function Pages() {
  const [path, setPath] = useState(location.pathname);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const bgVideoRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (reduced?.matches) {
        bgVideoRef.current?.pause();
        setVideoPlaying(false);
      } else {
        bgVideoRef.current?.play()?.catch(() => {});
        setVideoPlaying(true);
      }
    };
    update();
    reduced?.addEventListener?.("change", update);
    return () => reduced?.removeEventListener?.("change", update);
  }, []);

  const toggleVideo = () => {
    if (!bgVideoRef.current) return;
    if (bgVideoRef.current.paused) {
      bgVideoRef.current.play()?.catch(() => {});
      setVideoPlaying(true);
    } else {
      bgVideoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  useEffect(() => {
    const onBack = () => setPath(location.pathname);
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  const page = pages.find((p) => p.path === path || (path === "/crop" && p.mode === "crop") || ((path === "/watchdog" || path === "/env") && p.mode === "environment"));
  const home = path === "/" && !new URLSearchParams(location.search).has("lat");
  const activePage = page || (path === "/" && !home ? pages[0] : null);

  const navigate = (event, destination, question) => {
    if (
      (event.button != null && event.button !== 0) ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const params = new URLSearchParams(destination === "/" ? "" : location.search);
    params.delete("q");
    if (question) params.set("q", question);
    history.pushState({}, "", destination + (params.size ? "?" + params : ""));
    setPath(destination);
    window.scrollTo?.(0, 0);
  };

  return (
    <>
      {/* Global Background Video for all pages in an infinite loop */}
      <div className="site-video-background" aria-hidden="true">
        <video
          ref={bgVideoRef}
          className="site-video-element"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="/home.mp4"
          onEnded={(e) => e.target.play().catch(() => {})}
        />
        <div className="site-video-overlay" />
      </div>

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="feature-nav" aria-label="SatQuery features">
        <div className="brand-lockup">
          <div className="brand-icon-wrap" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="#5FE38A" strokeWidth="1.8" strokeDasharray="44 12" />
              <circle cx="14" cy="14" r="5" fill="#5FE38A" />
              <ellipse cx="14" cy="14" rx="13" ry="5" stroke="#5FE38A" strokeWidth="1.2" transform="rotate(-25 14 14)" strokeDasharray="28 8" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">SatQuery</span>
            <span className="brand-tagline">EARTH INTELLIGENCE</span>
          </div>
        </div>

        <div className="nav-links">
          <a
            href="/"
            className={home ? "nav-link-home active" : "nav-link-home"}
            aria-current={home ? "page" : undefined}
            onClick={(e) => navigate(e, "/")}
          >
            Home
          </a>
          {pages.map((p) => (
            <a
              key={p.path}
              href={p.path + location.search}
              aria-current={activePage?.path === p.path ? "page" : undefined}
              onClick={(e) => navigate(e, p.path)}
            >
              {p.path === "/ai" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: "6px", display: "inline-block", verticalAlign: "-1px" }} aria-hidden="true">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                </svg>
              )}
              {p.label}
            </a>
          ))}
          <a
            href="/datasets"
            aria-current={path === "/datasets" ? "page" : undefined}
            onClick={(e) => navigate(e, "/datasets")}
          >
            Data Sources
          </a>
        </div>

        <button className="user-profile-btn" aria-label="User Account" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </nav>

      {home ? (
        <Landing navigate={navigate} videoPlaying={videoPlaying} onToggleVideo={toggleVideo} />
      ) : path === "/datasets" ? (
        <DataSources />
      ) : activePage?.mode === "query" ? (
        <div style={{ maxWidth: "1380px", margin: "24px auto", padding: "0 20px" }}>
          <SatelliteQuery />
        </div>
      ) : activePage?.mode === "ai" ? (
        <div style={{ maxWidth: "1380px", margin: "24px auto", padding: "0 20px" }}>
          <AIMode initialPrompt={new URLSearchParams(location.search).get("q") || ""} />
        </div>
      ) : activePage?.mode === "flood" ? (
        <div style={{ maxWidth: "1380px", margin: "24px auto", padding: "0 20px" }}>
          <FloodDashboard />
        </div>
      ) : activePage?.mode === "crop" ? (
        <div style={{ maxWidth: "1380px", margin: "24px auto", padding: "0 20px" }}>
          <CropDamage />
        </div>
      ) : activePage?.mode === "environment" ? (
        <div style={{ maxWidth: "1380px", margin: "24px auto", padding: "0 20px" }}>
          <EnvironmentWatch />
        </div>
      ) : activePage?.mode === "social" ? (
        <SocialTrack navigate={navigate} />
      ) : !activePage ? (
        <main className="shell">
          <h1>Page not found</h1>
          <a href="/ai">Open Complete AI Mode</a>
        </main>
      ) : (
        <main className="shell">
          <Landing navigate={navigate} videoPlaying={videoPlaying} onToggleVideo={toggleVideo} />
        </main>
      )}

      <footer className="site-footer">
        <span>SatQuery · Earth intelligence, made queryable.</span>
        <span>Observed evidence. Transparent limitations.</span>
      </footer>
    </>
  );
}
