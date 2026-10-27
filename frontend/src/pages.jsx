import { useEffect, useState } from "react";
import Landing from "./components/Landing";
import DataSources from "./components/DataSources";
import AIMode from "./components/AIMode";
import FloodDashboard from "./components/FloodDashboard";
import CropDamage from "./components/CropDamage";
import EnvironmentWatch from "./components/EnvironmentWatch";
import SocialTrack from "./components/SocialTrack";
import "./design.css";

const pages = [
  { path: "/social-track", label: "🌍 Social Track", mode: "social" },
  { path: "/ai", label: "✨ Complete AI Mode", mode: "ai" },
  { path: "/flood", label: "🚨 Flood Dispatch", mode: "flood" },
  { path: "/crop-damage", label: "🌾 Crop Loss Verifier", mode: "crop" },
  { path: "/environment", label: "🌳 Environmental Watchdog", mode: "environment" },
];

export default function Pages() {
  const [path, setPath] = useState(location.pathname);

  useEffect(() => {
    const onBack = () => setPath(location.pathname);
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  const page = pages.find((p) => p.path === path);
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
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="feature-nav" aria-label="SatQuery features">
        <a className="brand" href="/" onClick={(e) => navigate(e, "/")}>
          <span aria-hidden="true">◉</span> SatQuery<span className="brand-dot">.</span>
        </a>
        {pages.map((p) => (
          <a
            key={p.path}
            href={p.path + location.search}
            aria-current={activePage?.path === p.path ? "page" : undefined}
            onClick={(e) => navigate(e, p.path)}
            style={p.path === "/ai" ? { color: "#c084fc", fontWeight: "700" } : undefined}
          >
            {p.label}
          </a>
        ))}
        <a
          href="/datasets"
          aria-current={path === "/datasets" ? "page" : undefined}
          onClick={(e) => navigate(e, "/datasets")}
        >
          Data sources
        </a>
      </nav>

      {home ? (
        <Landing navigate={navigate} />
      ) : path === "/datasets" ? (
        <DataSources />
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
        <SocialTrack />
      ) : !activePage ? (
        <main className="shell">
          <h1>Page not found</h1>
          <a href="/ai">Open Complete AI Mode</a>
        </main>
      ) : (
        <main className="shell">
          <Landing navigate={navigate} />
        </main>
      )}

      <footer className="site-footer">
        <span>SatQuery · Earth intelligence, made queryable.</span>
        <span>Observed evidence. Transparent limitations.</span>
      </footer>
    </>
  );
}
