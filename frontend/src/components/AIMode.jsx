import React, { useState } from "react";
import { aiAnalyze } from "../api/query";
import { printOrSaveAIDossier } from "../utils/pdf";

const EXAMPLE_AI_PROMPTS = [
  { label: "🚨 Assam Flood Triage", prompt: "Triage monsoon flood submergence & road breaches in Assam, find submerged villages" },
  { label: "💧 Sukhna Lake Shrinkage", prompt: "Is Sukhna Lake in Chandigarh shrinking? Calculate hectares lost from 2020 to 2024" },
  { label: "🌾 Punjab Crop Loss Claim", prompt: "My rice farm at 30.9°N, 75.8°E suffered severe flood damage on 2024-07-25, verify for PMFBY" },
  { label: "⛏️ Yamuna Sand Mining", prompt: "Check illegal riverbed sand mining along Yamuna near Panipat between 2021 and 2024" },
  { label: "🌳 Haridwar Forest Clearing", prompt: "Detect illegal deforestation and tree felling near Haridwar foothills in the last 2 years" },
];

export default function AIMode({ initialPrompt = "" }) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [showCoords, setShowCoords] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExecuteAI = async (textToRun) => {
    const q = textToRun || prompt;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        prompt: q.trim(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      };
      const data = await aiAnalyze(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("AI satellite orchestration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (pText) => {
    setPrompt(pText);
    handleExecuteAI(pText);
  };

  // Instant PDF export of the AI findings
  const handleDownloadDossierPDF = () => {
    if (!result) return;
    printOrSaveAIDossier({
      prompt,
      result,
    });
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-header-text">
          <div className="module-tag tag-ai">🤖 COMPLETE AI SATELLITE INTELLIGENCE MODE</div>
          <h1>Autonomous Natural Language Earth Observation</h1>
          <p>
            You don't need GIS skills or satellite engineering expertise. Type any prompt in plain language.
            Our Gemini-driven agent determines the right sensors (SAR radar, optical, NDVI, NDWI), geocodes locations,
            performs multi-temporal change detection, and produces actionable evidence dossiers.
          </p>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="preset-bar">
        <span className="preset-label">Example AI Inquiries:</span>
        {EXAMPLE_AI_PROMPTS.map((item, idx) => (
          <button key={idx} className="preset-chip" onClick={() => handlePromptClick(item.prompt)}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Main AI Input Bar */}
      <div className="control-card ai-main-card">
        <div className="ai-input-wrapper">
          <div className="ai-icon-large">🤖</div>
          <textarea
            className="ai-textarea"
            rows="3"
            placeholder="Describe what you want to analyze... e.g. 'Check if Yamuna riverbed encroachment near Panipat increased since 2021' or 'Analyze flood damage in Assam after July monsoon'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Optional Collapsible Coordinates */}
        <div className="ai-coords-toggle">
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowCoords(!showCoords)}
          >
            {showCoords ? "▼ Hide optional coordinates" : "▶ Add specific GPS coordinates (optional)"}
          </button>
        </div>

        {showCoords && (
          <div className="control-grid-4 mt-2">
            <div className="input-group">
              <label>Latitude (°N)</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Auto-geocoded from prompt"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Longitude (°E)</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Auto-geocoded from prompt"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="ai-action-bar">
          <span className="ai-hint">
            Tip: Mention any city, river, lake, or farm, plus dates or hazards.
          </span>
          <button
            className="btn-action btn-ai"
            onClick={() => handleExecuteAI()}
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Agent Running Multi-Spectral Pipeline..." : "✨ Run Autonomous AI Analysis"}
          </button>
        </div>
      </div>

      {error && <div className="alert-box error-alert">{error}</div>}

      {/* AI Processing Progress Skeleton */}
      {loading && (
        <div className="panel-card ai-processing-card">
          <div className="ai-spinner-row">
            <div className="orbit-spinner" />
            <div>
              <h4>Autonomous Agent Orchestration in Progress</h4>
              <p className="panel-sub">
                Parsing intent → Geocoding coordinates → Aligning Sentinel-1/2 telemetry → Generating forensic grounding...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="results-wrapper">
          {/* Header Banner */}
          <div className="ai-result-badge-bar">
            <span className="ai-mod-badge">
              Orchestrated via: <strong>{result.module_used}</strong>
            </span>
            <span className="ai-intent-pill">Intent: {result.intent}</span>
            <button className="btn-outline-sm" onClick={handleDownloadDossierPDF}>
              📥 Export AI Dossier (PDF)
            </button>
          </div>

          {/* AI Narrative Section */}
          <div className="panel-card ai-narrative-card">
            <div className="narrative-header">
              <span className="ai-icon">✨</span>
              <h4>Gemini AI Forensic Planetary Assessment</h4>
            </div>
            <div className="narrative-body markdown-style">
              {result.narrative.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>

          {/* Satellite Telemetry Viewer (if imagery in result) */}
          {result.result && (
            <div className="panel-card">
              <h3>🛰️ Autonomous Satellite Observation Grounding</h3>
              <p className="panel-sub">
                Multi-temporal spectral telemetry retrieved and processed by the AI agent:
              </p>
              <div className="image-triptych">
                {result.result.sar_before_b64 || result.result.before_b64 ? (
                  <div className="img-box">
                    <span className="img-tag">Baseline Observation</span>
                    <img
                      src={
                        (result.result.sar_before_b64 || result.result.before_b64).startsWith("data:")
                          ? result.result.sar_before_b64 || result.result.before_b64
                          : `data:image/png;base64,${result.result.sar_before_b64 || result.result.before_b64}`
                      }
                      alt="Baseline Observation"
                    />
                  </div>
                ) : null}

                {result.result.sar_after_b64 || result.result.after_b64 ? (
                  <div className="img-box">
                    <span className="img-tag">Recent / Disaster Observation</span>
                    <img
                      src={
                        (result.result.sar_after_b64 || result.result.after_b64).startsWith("data:")
                          ? result.result.sar_after_b64 || result.result.after_b64
                          : `data:image/png;base64,${result.result.sar_after_b64 || result.result.after_b64}`
                      }
                      alt="Recent Observation"
                    />
                  </div>
                ) : null}

                {result.result.diff_b64 ? (
                  <div className="img-box highlight-box">
                    <span className="img-tag tag-alert">Autonomous Change / Triage Overlay</span>
                    <img
                      src={
                        result.result.diff_b64.startsWith("data:")
                          ? result.result.diff_b64
                          : `data:image/png;base64,${result.result.diff_b64}`
                      }
                      alt="Change Mask"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Structured Result Metrics */}
          {result.result && (
            <div className="metrics-row">
              {result.result.affected_area_km2 !== undefined && (
                <div className="metric-card metric-red">
                  <span className="metric-title">Inundated Area</span>
                  <span className="metric-value">{result.result.affected_area_km2} <small>km²</small></span>
                </div>
              )}
              {result.result.area_changed_hectares !== undefined && (
                <div className="metric-card metric-red">
                  <span className="metric-title">Area Depleted</span>
                  <span className="metric-value">{result.result.area_changed_hectares} <small>hectares</small></span>
                </div>
              )}
              {result.result.ndvi_drop_pct !== undefined && (
                <div className="metric-card metric-red">
                  <span className="metric-title">Canopy Loss</span>
                  <span className="metric-value">{result.result.ndvi_drop_pct}%</span>
                </div>
              )}
              {result.result.severity_level && (
                <div className="metric-card">
                  <span className="metric-title">Triage Level</span>
                  <span className="metric-badge badge-critical">{result.result.severity_level}</span>
                </div>
              )}
              {result.result.damage_severity && (
                <div className="metric-card">
                  <span className="metric-title">Loss Severity</span>
                  <span className="metric-badge badge-critical">{result.result.damage_severity}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
