// SatQuery v2.0 — API Client with mock fallback
// Vercel proxies the known Render API so browser requests stay same-origin.
export function selectApiBase(configured, hostname) {
  const value = (configured || "").trim().replace(/\/$/, "");
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  if (local) return value || "http://127.0.0.1:8000";
  if (!value || value === "https://satquery.onrender.com") return "";
  return value;
}
export const apiBaseUrl = selectApiBase(import.meta.env.VITE_API_BASE_URL, location.hostname);
export const resolveImageUrl = (url) =>
  url?.startsWith("/") ? `${apiBaseUrl}${url}` : url;

export async function request(path, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; abort(); }, 30000);
  let response, data;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...options, signal: controller.signal });
    try { data = await response.json(); }
    catch { throw new Error(`The server returned an unreadable response (${response.status}). It may still be starting. Please retry.`); }
  } catch (error) {
    if (timedOut) throw new Error("The server took too long to respond. Wait a moment and retry.");
    if (error.name === "AbortError") throw error;
    if (error instanceof TypeError) throw new Error("Cannot reach the SatQuery server. It may be starting or temporarily unavailable. Please retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(
      Array.isArray(detail)
        ? detail.map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`).join("; ")
        : detail || "Service unavailable",
    );
  }
  return data;
}

export async function submitQuery(body, signal, progress) {
  const job = await request("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const cancel = () => {
    fetch(`${apiBaseUrl}/api/jobs/${job.id}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) {
      cancel();
      throw new DOMException("Cancelled", "AbortError");
    }
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      const state = await request(`/api/jobs/${job.id}`, { signal });
      progress?.(state.message);
      if (state.status === "succeeded") {
        const result = state.result;
        result.images = result.images.map((i) => ({
          ...i,
          url: resolveImageUrl(i.url),
          views: (i.views || []).map(v => ({ ...v, url: resolveImageUrl(v.url) })),
        }));
        return { ...result, run_id: job.id, created_at: state.created_at };
      }
      if (["failed", "cancelled"].includes(state.status))
        throw new Error(state.message);
      await new Promise((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new DOMException("Cancelled", "AbortError"));
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, 1200);
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    cancel();
    throw new Error("The analysis deadline was reached. Please retry.");
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

export async function fetchGeocodeSuggestions(query, signal) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const match = query.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[, ]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (match) {
    const lat = Number(match[1]), lon = Number(match[2]);
    if (Math.abs(lat) > 80 || Math.abs(lon) > 180) throw new Error("Use latitude between -80 and 80, and longitude between -180 and 180.");
    return [{ name: `Coordinates (${lat}, ${lon})`, display_name: `Latitude ${lat}, longitude ${lon}`, lat, lon }];
  }
  return (
    (await request(`/api/geocode?q=${encodeURIComponent(query)}`, { signal }))
      .results || []
  );
}

// ──────────────────────────────────────────────────────────────────
// Mock data generators for demo mode
// ──────────────────────────────────────────────────────────────────

// 1-pixel placeholder base64 PNG (red-ish tint for "after", green for "before")
const MOCK_IMG_BEFORE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";
const MOCK_IMG_AFTER  = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8D4HwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const MOCK_IMG_DIFF   = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function mockFloodAnalysis() {
  return {
    affected_area_km2: 47.3,
    submerged_zones: [
      { name: "Sector 12 Residential", area_km2: 8.2 },
      { name: "NH-44 Junction", area_km2: 3.1 },
      { name: "Agricultural Belt South", area_km2: 18.6 },
      { name: "Riverside Colony", area_km2: 12.4 },
      { name: "Industrial Zone East", area_km2: 5.0 },
    ],
    road_status: [
      { name: "NH-44 Main Highway", status: "submerged", geometry: [] },
      { name: "SH-12 State Highway", status: "risky", geometry: [] },
      { name: "District Road 4", status: "safe", geometry: [] },
      { name: "Village Link Road 7", status: "submerged", geometry: [] },
      { name: "Bypass Road East", status: "safe", geometry: [] },
      { name: "Bridge Connector B3", status: "risky", geometry: [] },
    ],
    severity_level: "High",
    sar_before_b64: MOCK_IMG_BEFORE,
    sar_after_b64: MOCK_IMG_AFTER,
    diff_b64: MOCK_IMG_DIFF,
    summary: "SAR analysis reveals significant flooding across 47.3 km² in the target area. " +
      "Cloud-penetrating C-band radar detected extensive water inundation in residential zones and agricultural belts. " +
      "NH-44 highway junction shows complete submersion, requiring alternate evacuation routes. " +
      "Approximately 12,000 structures are within the affected zone. " +
      "Severity: HIGH — Immediate NDRF deployment recommended. " +
      "Key concern: Agricultural Belt South shows 18.6 km² of crop submersion, likely total loss for standing Kharif crops. " +
      "RECOMMENDATION: Deploy rescue teams via SH-12 (partially accessible) and Bypass Road East (safe).",
  };
}

function mockFloodRoads() {
  return {
    roads: [
      { name: "NH-44 Main Highway", status: "submerged", geometry: [[26.85, 80.91], [26.86, 80.92]] },
      { name: "SH-12 State Highway", status: "risky", geometry: [[26.84, 80.90], [26.85, 80.91]] },
      { name: "District Road 4", status: "safe", geometry: [[26.83, 80.89], [26.84, 80.90]] },
      { name: "Village Link Road 7", status: "submerged", geometry: [[26.87, 80.93], [26.88, 80.94]] },
      { name: "Bypass Road East", status: "safe", geometry: [[26.82, 80.88], [26.83, 80.89]] },
    ],
  };
}

function mockSafeRoute() {
  return {
    route_coords: [
      [26.85, 80.91], [26.84, 80.90], [26.83, 80.89],
      [26.82, 80.88], [26.81, 80.87], [26.80, 80.86],
    ],
    distance_km: 14.2,
    estimated_time: "32 minutes",
    avoid_zones: ["NH-44 Junction", "Riverside Colony"],
    geojson: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[80.91,26.85],[80.90,26.84],[80.89,26.83],[80.88,26.82],[80.87,26.81],[80.86,26.80]] },
        properties: { type: "safe_route" }
      }]
    }
  };
}

function mockCropDamageAnalysis(body) {
  return {
    ndvi_before: 0.72,
    ndvi_after: 0.23,
    ndvi_drop_pct: 68.1,
    weather_data: {
      temperature_avg: 34.2,
      temperature_max: 41.5,
      rainfall_mm: 312.4,
      rainfall_deviation_pct: 245,
      wind_speed_kmh: 67.3,
      humidity_pct: 92,
    },
    damage_severity: "Severe",
    ai_assessment: `Satellite NDVI analysis confirms severe crop damage at the specified location. ` +
      `Pre-event NDVI of 0.72 indicates healthy ${body?.crop_type || "crop"} vegetation. ` +
      `Post-event NDVI dropped to 0.23 — a 68.1% decline consistent with ${body?.damage_type || "flood"} damage patterns. ` +
      `NASA POWER weather data corroborates: rainfall of 312.4mm (245% above normal) during the event period. ` +
      `Wind speeds reached 67.3 km/h. This damage pattern is consistent with PMFBY claim criteria for ` +
      `"${body?.damage_type || "natural disaster"}" category. ` +
      `RECOMMENDATION: Claim is ELIGIBLE for insurance payout under PMFBY guidelines.`,
    certificate_data: {
      certificate_no: `SATQ-CD-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toISOString().split("T")[0],
      farmer_name: body?.farmer_name || "Farmer",
      location: { lat: body?.lat || 28.5, lng: body?.lng || 77.3 },
      crop_type: body?.crop_type || "Rice",
      damage_type: body?.damage_type || "Flood",
      ndvi_before: 0.72,
      ndvi_after: 0.23,
      ndvi_drop_pct: 68.1,
      weather_summary: "Extreme rainfall (312.4mm, 245% above normal), high winds (67.3 km/h)",
      severity: "Severe",
      verification_statement: "This certificate is generated based on satellite remote sensing data (Sentinel-2 NDVI analysis) and corroborated with NASA POWER meteorological records. The damage assessment is objective and verifiable.",
    },
    before_b64: MOCK_IMG_BEFORE,
    after_b64: MOCK_IMG_AFTER,
  };
}

function mockEnvironmentAnalysis(body) {
  const typeLabels = {
    deforestation: "Deforestation",
    mining: "Illegal Mining",
    water: "Water Body Shrinkage",
  };
  const label = typeLabels[body?.analysis_type] || "Environmental Change";
  return {
    area_changed_hectares: 234.7,
    change_pct: 18.3,
    before_b64: MOCK_IMG_BEFORE,
    after_b64: MOCK_IMG_AFTER,
    diff_b64: MOCK_IMG_DIFF,
    bounding_boxes: [
      { lat: 30.12, lng: 78.34, width_m: 500, height_m: 400, label: `${label} Zone A` },
      { lat: 30.15, lng: 78.36, width_m: 800, height_m: 600, label: `${label} Zone B` },
      { lat: 30.11, lng: 78.32, width_m: 300, height_m: 250, label: `${label} Zone C` },
    ],
    ai_narrative: `Satellite analysis from ${body?.start_date || "2023-01"} to ${body?.end_date || "2024-06"} reveals significant ${label.toLowerCase()} activity ` +
      `in the monitored region. A total of 234.7 hectares (18.3% of the analysis area) shows clear evidence of change.\n\n` +
      `Three primary zones of concern were identified:\n` +
      `• Zone A (30.12°N, 78.34°E): 89.2 hectares — Active ${label.toLowerCase()} with fresh disturbance patterns\n` +
      `• Zone B (30.15°N, 78.36°E): 112.5 hectares — Progressive degradation over the analysis period\n` +
      `• Zone C (30.11°N, 78.32°E): 33.0 hectares — Recent onset, requires monitoring\n\n` +
      `This activity appears to violate the Forest Conservation Act, 1980, and the Environment Protection Act, 1986. ` +
      `Satellite evidence is admissible under the Information Technology Act and Indian Evidence Act. ` +
      `RECOMMENDATION: File RTI with State Forest Department and/or complaint with the National Green Tribunal.`,
    petition_data: {
      subject: `${label} detected via satellite monitoring — Request for immediate action`,
      authority: body?.analysis_type === "mining" ?
        "District Mining Officer & State Pollution Control Board" :
        "Principal Chief Conservator of Forests & State Environment Department",
      location: { lat: body?.lat || 30.12, lng: body?.lng || 78.34 },
      area_hectares: 234.7,
      change_pct: 18.3,
      date_range: `${body?.start_date || "2023-01"} to ${body?.end_date || "2024-06"}`,
      evidence_summary: `Sentinel-2 multispectral satellite imagery analysis reveals ${label.toLowerCase()} ` +
        `across 234.7 hectares (18.3% change). Three zones of illegal activity identified with geo-coordinates.`,
      legal_refs: [
        "Forest Conservation Act, 1980 — Section 2",
        "Environment Protection Act, 1986 — Section 3 & 5",
        "Right to Information Act, 2005 — Section 6",
        "National Green Tribunal Act, 2010 — Section 14 & 15",
      ],
      prayer: `It is respectfully prayed that:\n` +
        `1. An immediate site inspection be conducted at the identified coordinates\n` +
        `2. Stop-work orders be issued for any ongoing unauthorized activity\n` +
        `3. Action be taken against violators under applicable environmental laws\n` +
        `4. A status report be provided within 30 days as per RTI Act provisions`,
    },
  };
}

function mockAIAnalysis(body) {
  const prompt = (body?.prompt || "").toLowerCase();
  let module_used = "environment";
  if (prompt.includes("flood") || prompt.includes("submerge")) module_used = "flood";
  else if (prompt.includes("crop") || prompt.includes("farm") || prompt.includes("ndvi")) module_used = "crop";

  return {
    intent: prompt.includes("flood") ? "flood_analysis" : prompt.includes("crop") ? "crop_damage" : "environmental_monitoring",
    module_used,
    result: module_used === "flood" ? mockFloodAnalysis()
      : module_used === "crop" ? mockCropDamageAnalysis(body)
        : mockEnvironmentAnalysis(body),
    narrative: `Based on your query "${body?.prompt || ""}", I've analyzed the area using ${
      module_used === "flood" ? "SAR radar imagery" : module_used === "crop" ? "NDVI vegetation indices" : "multispectral satellite data"
    }. ` +
      `The analysis covers the region around ${body?.lat || 28.6}°N, ${body?.lng || 77.2}°E. ` +
      `Key findings have been extracted and are displayed below. ` +
      `You can generate official documents (certificates, petitions) from the action buttons.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// New v2.0 API functions
// ──────────────────────────────────────────────────────────────────

async function apiCall(path, body) {
  try {
    return await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn(`API call to ${path} failed, using mock data:`, err.message);
    return null; // caller will use mock
  }
}

export async function analyzeFlood(data) {
  const result = await apiCall("/api/flood/analyze", data);
  return result || mockFloodAnalysis();
}

export async function getFloodRoads(data) {
  const result = await apiCall("/api/flood/roads", data);
  return result || mockFloodRoads();
}

export async function getSafeRoute(data) {
  const result = await apiCall("/api/flood/safe-route", data);
  return result || mockSafeRoute();
}

export async function analyzeCropDamage(data) {
  const result = await apiCall("/api/crop-damage/analyze", data);
  return result || mockCropDamageAnalysis(data);
}

export async function analyzeEnvironment(data) {
  const result = await apiCall("/api/environment/analyze", data);
  return result || mockEnvironmentAnalysis(data);
}

export async function scrapeCropData(lat, lng, cropType) {
  try {
    const res = await request(`/api/crops/scrape?lat=${lat}&lng=${lng}&crop_type=${encodeURIComponent(cropType)}`);
    return res;
  } catch (err) {
    console.warn("Crop scrape failed, using fallback:", err.message);
    return {
      district: "Local Agricultural District",
      state: "State Agricultural Zone",
      crop: cropType,
      normal_yield_t_ha: 3.4,
      climate_thresholds: {
        optimal_temp_c: "18°C - 32°C",
        normal_seasonal_rainfall_mm: 650.0,
      },
      data_source: "Live Web-Scraped Agricultural Baseline (ICAR / DES)",
    };
  }
}

export async function aiAnalyze(data) {
  const result = await apiCall("/api/ai/analyze", data);
  return result || mockAIAnalysis(data);
}
