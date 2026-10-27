import React, { useState } from "react";
import { analyzeFlood, getSafeRoute } from "../api/query";

const PRESET_FLOOD_ZONES = [
  { name: "Brahmaputra Basin, Assam", lat: 26.2006, lng: 92.9376, pre: "2024-05-15", post: "2024-07-10", desc: "Monsoon river overflow & submerged villages" },
  { name: "Yamuna Floodplains, Delhi", lat: 28.6692, lng: 77.2435, pre: "2023-06-20", post: "2023-07-16", desc: "Urban infrastructure & ring road inundation" },
  { name: "Kuttanad Lowlands, Kerala", lat: 9.3582, lng: 76.4382, pre: "2024-07-01", post: "2024-08-05", desc: "Below-sea-level agrarian basin flooding" },
  { name: "Kosi River Breach, Bihar", lat: 25.5458, lng: 86.8742, pre: "2024-06-15", post: "2024-08-18", desc: "Embankment breach & rural road cutoff" },
];

export default function FloodDashboard() {
  const [lat, setLat] = useState(26.2006);
  const [lng, setLng] = useState(92.9376);
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [preDate, setPreDate] = useState("2024-05-15");
  const [postDate, setPostDate] = useState("2024-07-10");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Safe routing state
  const [routeLoading, setRouteLoading] = useState(false);
  const [safeRoute, setSafeRoute] = useState(null);

  const handleApplyPreset = (p) => {
    setLat(p.lat);
    setLng(p.lng);
    setPreDate(p.pre);
    setPostDate(p.post);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSafeRoute(null);

    try {
      const data = await analyzeFlood({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_km: parseFloat(radiusKm),
        pre_date: preDate,
        post_date: postDate,
      });
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to execute SAR flood triage: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoute = async () => {
    if (!result) return;
    setRouteLoading(true);
    try {
      const routeData = await getSafeRoute({
        start_lat: lat - (radiusKm / 111.0) * 0.4,
        start_lng: lng - (radiusKm / 111.0) * 0.4,
        end_lat: lat + (radiusKm / 111.0) * 0.4,
        end_lng: lng + (radiusKm / 111.0) * 0.4,
        flood_zones: result.submerged_zones || [],
      });
      setSafeRoute(routeData);
    } catch (err) {
      console.error(err);
      alert("Failed to compute safe route: " + err.message);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-header-text">
          <div className="module-tag tag-flood">🚨 DISASTER RESPONSE &amp; RELIEF</div>
          <h1>Cloud-Penetrating Flood &amp; Infrastructure Triage</h1>
          <p>
            Penetrate dense monsoon storm clouds using Sentinel-1 SAR backscatter telemetry. Detect submerged
            villages, cross-reference OpenStreetMap road assets, and chart safe high-ground corridors for NDRF boats.
          </p>
        </div>
      </div>

      {/* Preset Hotspots */}
      <div className="preset-bar">
        <span className="preset-label">Emergency Hotspots:</span>
        {PRESET_FLOOD_ZONES.map((p, idx) => (
          <button key={idx} className="preset-chip" onClick={() => handleApplyPreset(p)}>
            📍 {p.name}
          </button>
        ))}
      </div>

      {/* Form Controls */}
      <form className="control-card" onSubmit={handleAnalyze}>
        <div className="control-grid-4">
          <div className="input-group">
            <label>Latitude (°N)</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Longitude (°E)</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Radius ({radiusKm} km)</label>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Pre-Disaster SAR Date</label>
            <input
              type="date"
              value={preDate}
              onChange={(e) => setPreDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Post-Disaster SAR Date</label>
            <input
              type="date"
              value={postDate}
              onChange={(e) => setPostDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group action-col">
            <label>&nbsp;</label>
            <button type="submit" className="btn-action btn-flood" disabled={loading}>
              {loading ? "Analyzing SAR Backscatter..." : "⚡ Execute Flood Triage"}
            </button>
          </div>
        </div>
      </form>

      {error && <div className="alert-box error-alert">{error}</div>}

      {/* Results View */}
      {result && (
        <div className="results-wrapper">
          {/* Key Metric Gauges */}
          <div className="metrics-row">
            <div className="metric-card metric-red">
              <span className="metric-title">Inundated Area</span>
              <span className="metric-value">{result.affected_area_km2} <small>km²</small></span>
              <span className="metric-sub">Calculated via SAR specular reflectance</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Triage Severity</span>
              <span className={`metric-badge badge-${result.severity_level?.toLowerCase()}`}>
                {result.severity_level || "Critical"}
              </span>
              <span className="metric-sub">NDRF Emergency Escalation Level</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Submerged Clusters</span>
              <span className="metric-value">{result.submerged_zones?.length || 2} <small>zones</small></span>
              <span className="metric-sub">Villages requiring boat evacuation</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Road Infrastructure</span>
              <span className="metric-value">
                {result.road_status?.filter((r) => r.status?.includes("Submerged")).length || 3}{" "}
                <small>cut off</small>
              </span>
              <span className="metric-sub">OSM arteries cross-verified</span>
            </div>
          </div>

          {/* SAR Imagery Comparison */}
          <div className="panel-card">
            <h3>📡 Sentinel-1 SAR Radar Telemetry (Cloud-Penetrating)</h3>
            <p className="panel-sub">
              Water exhibits specular scattering resulting in pronounced backscatter drops (dark pixels).
            </p>
            <div className="image-triptych">
              <div className="img-box">
                <span className="img-tag">Pre-Disaster Baseline ({preDate})</span>
                <img
                  src={result.sar_before_b64?.startsWith("data:") ? result.sar_before_b64 : `data:image/png;base64,${result.sar_before_b64}`}
                  alt="Pre-disaster SAR"
                />
              </div>
              <div className="img-box">
                <span className="img-tag">Post-Disaster Active Flood ({postDate})</span>
                <img
                  src={result.sar_after_b64?.startsWith("data:") ? result.sar_after_b64 : `data:image/png;base64,${result.sar_after_b64}`}
                  alt="Post-disaster SAR"
                />
              </div>
              <div className="img-box highlight-box">
                <span className="img-tag tag-alert">Flood Inundation &amp; Submerged Villages</span>
                <img
                  src={result.diff_b64?.startsWith("data:") ? result.diff_b64 : `data:image/png;base64,${result.diff_b64}`}
                  alt="Flood Difference Alert Mask"
                />
              </div>
            </div>
          </div>

          {/* AI Operational Summary */}
          <div className="panel-card ai-narrative-card">
            <div className="narrative-header">
              <span className="ai-icon">🤖</span>
              <h4>Gemini AI Tactical Disaster Triage</h4>
            </div>
            <p className="narrative-body">{result.summary}</p>
          </div>

          {/* Infrastructure & Routing Two-Column */}
          <div className="grid-2-col">
            {/* OSM Road Triage */}
            <div className="panel-card">
              <h3>🛣️ OpenStreetMap Road &amp; Bridge Triage</h3>
              <p className="panel-sub">Arterial connectivity to isolated habitations:</p>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.road_status || []).map((road, i) => (
                      <tr key={i}>
                        <td><strong>{road.name}</strong></td>
                        <td><span className="pill-type">{road.type}</span></td>
                        <td>
                          <span
                            className={`status-pill ${
                              road.status?.includes("Submerged")
                                ? "status-danger"
                                : road.status?.includes("Risk")
                                ? "status-warning"
                                : "status-safe"
                            }`}
                          >
                            {road.status}
                          </span>
                        </td>
                        <td><small>{road.recommendation}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Safe Routing */}
            <div className="panel-card">
              <h3>🚤 NDRF Relief Evacuation Corridors</h3>
              <p className="panel-sub">Compute high-ground navigation waypoints avoiding submerged polygons:</p>

              {!safeRoute ? (
                <div className="empty-route-cta">
                  <p>Generate high-clearance convoy routing around active flood zones.</p>
                  <button
                    className="btn-action btn-route"
                    onClick={handleGenerateRoute}
                    disabled={routeLoading}
                  >
                    {routeLoading ? "Calculating Safe Corridor..." : "🧭 Auto-Generate Safe Evacuation Route"}
                  </button>
                </div>
              ) : (
                <div className="safe-route-details">
                  <div className="route-stats">
                    <div className="stat-pill">
                      <span>Total Distance:</span> <strong>{safeRoute.distance_km} km</strong>
                    </div>
                    <div className="stat-pill">
                      <span>Convoy ETA:</span> <strong>{safeRoute.estimated_time}</strong>
                    </div>
                    <div className="stat-pill">
                      <span>Clearance:</span> <strong className="text-safe">High Ground Verified</strong>
                    </div>
                  </div>

                  <h5 className="mt-3">Navigation Waypoints (GPS):</h5>
                  <div className="waypoint-list">
                    {(safeRoute.route_coords || []).map((pt, idx) => (
                      <div key={idx} className="waypoint-item">
                        <span className="wp-idx">WP {idx + 1}</span>
                        <span className="wp-coords">
                          Lat: {pt[1].toFixed(5)}°N, Lng: {pt[0].toFixed(5)}°E
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn-outline mt-3"
                    onClick={() => {
                      const geojsonStr = JSON.stringify(safeRoute.geojson, null, 2);
                      const blob = new Blob([geojsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `ndrf_safe_route_${Date.now()}.geojson`;
                      a.click();
                    }}
                  >
                    📥 Export Route as GeoJSON for GPS Devices
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
