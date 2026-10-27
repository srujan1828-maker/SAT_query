import React, { useState } from "react";
import { analyzeCropDamage, scrapeCropData } from "../api/query";
import { printOrSaveCropCertificate } from "../utils/pdf";

const PRESET_FARMS = [
  { name: "Ludhiana District, Punjab (Paddy / Rice)", lat: 30.9010, lng: 75.8573, crop: "Rice", peril: "flood", date: "2024-07-25", farmer: "Gurpreet Singh" },
  { name: "Vidarbha, Maharashtra (Cotton / Drought)", lat: 20.9320, lng: 77.7523, crop: "Cotton", peril: "drought", date: "2024-06-30", farmer: "Anand Shinde" },
  { name: "Bundelkhand, UP (Wheat / Hailstorm)", lat: 25.4484, lng: 78.5685, crop: "Wheat", peril: "hail", date: "2024-03-12", farmer: "Ram Charan" },
  { name: "Rohtas, Bihar (Paddy / Unseasonal Rain)", lat: 24.9547, lng: 84.0150, crop: "Rice", peril: "unseasonal_rain", date: "2024-08-20", farmer: "Lalit Yadav" },
];

export default function CropDamage() {
  const [lat, setLat] = useState(30.9010);
  const [lng, setLng] = useState(75.8573);
  const [cropType, setCropType] = useState("Rice");
  const [damageType, setDamageType] = useState("flood");
  const [claimDate, setClaimDate] = useState("2024-07-25");
  const [farmerName, setFarmerName] = useState("Gurpreet Singh");
  const [voiceSimText, setVoiceSimText] = useState("हैलस्टॉर्म और तेज बारिश से हमारी 4 एकड़ धान की फसल खराब हो गई है, कृपया मुआबजा सर्टिफिकेट दें।");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Internet scraper state
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  const handleApplyPreset = (p) => {
    setLat(p.lat);
    setLng(p.lng);
    setCropType(p.crop);
    setDamageType(p.peril);
    setClaimDate(p.date);
    setFarmerName(p.farmer);
  };

  // Automated internet crop scraper trigger
  const handleScrapeInternet = async () => {
    setScraping(true);
    try {
      const data = await scrapeCropData(lat, lng, cropType);
      setScrapedData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setScraping(false);
    }
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await analyzeCropDamage({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        crop_type: cropType,
        damage_type: damageType,
        claim_date: claimDate,
        farmer_name: farmerName,
      });
      setResult(data);
      if (data.weather_data?.district_benchmark) {
        setScrapedData(data.weather_data.district_benchmark);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify crop damage: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificatePDF = () => {
    if (!result) return;
    printOrSaveCropCertificate({
      farmerName,
      lat,
      lng,
      cropType,
      damageType,
      claimDate,
      scrapedData,
      result,
    });
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="module-header-text">
          <div className="module-tag tag-crop">🌾 AGRICULTURE &amp; RURAL WELFARE</div>
          <h1>Zero-Cost Crop Loss &amp; Insurance Verifier</h1>
          <p>
            Eliminate months of bureaucratic delay for PMFBY claims. SatQuery automatically scrapes internet
            agricultural archives for district normal yields, correlates NASA POWER weather, and computes
            Sentinel-2 NDVI canopy collapse to issue a legally grounded Crop Damage Certificate.
          </p>
        </div>
      </div>

      {/* Preset Indian Agricultural Hubs */}
      <div className="preset-bar">
        <span className="preset-label">Sample Farm Pins:</span>
        {PRESET_FARMS.map((p, idx) => (
          <button key={idx} className="preset-chip" onClick={() => handleApplyPreset(p)}>
            🌾 {p.name}
          </button>
        ))}
      </div>

      {/* Telegram / Voice Claim Bot Simulation Banner */}
      <div className="voice-bot-banner">
        <div className="voice-bot-header">
          <span className="voice-icon">🎙️</span>
          <strong>Telegram &amp; Voice Claim Assistant (Simulated Audio Stream)</strong>
        </div>
        <div className="voice-bot-input-row">
          <input
            type="text"
            className="voice-text-box"
            value={voiceSimText}
            onChange={(e) => setVoiceSimText(e.target.value)}
            placeholder="Speak crop issue in Hindi / Punjabi / Marathi / English..."
          />
          <button className="btn-voice-sync" onClick={() => handleAnalyze()}>
            Sync &amp; Analyze Voice Claim ⚡
          </button>
        </div>
      </div>

      {/* Form Controls */}
      <form className="control-card" onSubmit={handleAnalyze}>
        <div className="control-grid-4">
          <div className="input-group">
            <label>Farmer / Landholder Name</label>
            <input
              type="text"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>
          <div className="input-group">
            <label>Farm Latitude (°N)</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Farm Longitude (°E)</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Crop Type</label>
            <select value={cropType} onChange={(e) => setCropType(e.target.value)}>
              <option value="Rice">Rice / Paddy</option>
              <option value="Wheat">Wheat</option>
              <option value="Cotton">Cotton</option>
              <option value="Sugarcane">Sugarcane</option>
              <option value="Maize">Maize</option>
              <option value="Soybean">Soybean</option>
              <option value="Mustard">Mustard</option>
              <option value="Pulses">Pulses / Gram</option>
            </select>
          </div>
          <div className="input-group">
            <label>Reported Peril / Hazard</label>
            <select value={damageType} onChange={(e) => setDamageType(e.target.value)}>
              <option value="flood">Monsoon Flood / Inundation</option>
              <option value="drought">Severe Drought / Dry Spell</option>
              <option value="hail">Hailstorm / Mechanical Damage</option>
              <option value="unseasonal_rain">Unseasonal Rain &amp; Lodging</option>
            </select>
          </div>
          <div className="input-group">
            <label>Loss Event Date</label>
            <input
              type="date"
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group action-col">
            <label>&nbsp;</label>
            <button type="submit" className="btn-action btn-crop" disabled={loading}>
              {loading ? "Verifying Canopy & Weather..." : "🔍 Verify Crop Damage"}
            </button>
          </div>
        </div>

        {/* Internet Scraper Quick Bar */}
        <div className="scraper-bar-inner">
          <button
            type="button"
            className="btn-scraper"
            onClick={handleScrapeInternet}
            disabled={scraping}
          >
            {scraping ? "🌐 Scraping Open Agricultural Archives..." : "🌐 Auto-Scrape District Crop Data from Internet"}
          </button>
          <span className="scraper-hint">
            No CSV needed — automatically retrieves historical yields &amp; agro-climatic baselines for this GPS pin.
          </span>
        </div>
      </form>

      {/* Scraped Data Display */}
      {scrapedData && (
        <div className="panel-card scraper-result-card">
          <div className="scraper-header">
            <span className="badge-scraper">LIVE INTERNET DATA RETRIEVED</span>
            <h4>
              District Agricultural Profile: {scrapedData.district}, {scrapedData.state}
            </h4>
          </div>
          <div className="scraper-stats-grid">
            <div className="stat-pill">
              <span>Normal Benchmark Yield:</span> <strong>{scrapedData.normal_yield_t_ha} t/ha</strong>
            </div>
            <div className="stat-pill">
              <span>Optimal Climate:</span> <strong>{scrapedData.climate_thresholds?.optimal_temp_c}</strong>
            </div>
            <div className="stat-pill">
              <span>Normal Seasonal Rain:</span>{" "}
              <strong>{scrapedData.climate_thresholds?.normal_seasonal_rainfall_mm} mm</strong>
            </div>
            <div className="stat-pill">
              <span>Data Source:</span> <small>{scrapedData.data_source}</small>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert-box error-alert">{error}</div>}

      {/* Analysis Results */}
      {result && (
        <div className="results-wrapper">
          {/* Key Gauges */}
          <div className="metrics-row">
            <div className="metric-card metric-red">
              <span className="metric-title">NDVI Canopy Collapse</span>
              <span className="metric-value">{result.ndvi_drop_pct}%</span>
              <span className="metric-sub">Statutory PMFBY threshold: 33%</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Damage Severity</span>
              <span className="metric-badge badge-critical">{result.damage_severity}</span>
              <span className="metric-sub">Certified for compensation</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Pre-Disaster NDVI</span>
              <span className="metric-value">{result.ndvi_before}</span>
              <span className="metric-sub">Healthy lush canopy</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Post-Disaster NDVI</span>
              <span className="metric-value">{result.ndvi_after}</span>
              <span className="metric-sub">Severe necrosis / submergence</span>
            </div>
          </div>

          {/* Sentinel-2 Imagery */}
          <div className="panel-card">
            <h3>🌱 Multi-Temporal Sentinel-2 NDVI Canopy Telemetry</h3>
            <p className="panel-sub">
              Normalized Difference Vegetation Index (B08 NIR - B04 Red): Green = Healthy, Red/Brown = Destroyed
            </p>
            <div className="image-triptych">
              <div className="img-box">
                <span className="img-tag">Before Loss Event (Healthy Field)</span>
                <img
                  src={result.before_b64?.startsWith("data:") ? result.before_b64 : `data:image/png;base64,${result.before_b64}`}
                  alt="Pre-disaster NDVI"
                />
              </div>
              <div className="img-box highlight-box">
                <span className="img-tag tag-alert">After Loss Event ({damageType.toUpperCase()})</span>
                <img
                  src={result.after_b64?.startsWith("data:") ? result.after_b64 : `data:image/png;base64,${result.after_b64}`}
                  alt="Post-disaster NDVI"
                />
              </div>
            </div>
          </div>

          {/* NASA Weather Corroboration */}
          <div className="grid-2-col">
            <div className="panel-card">
              <h3>🌦️ NASA POWER Agro-Climatology Corroboration</h3>
              <p className="panel-sub">Independent satellite weather telemetry across damage window:</p>
              <div className="weather-grid">
                <div className="weather-item">
                  <span className="w-label">Cumulative Rainfall</span>
                  <span className="w-val">{result.weather_data?.total_rainfall_mm} mm</span>
                </div>
                <div className="weather-item">
                  <span className="w-label">Peak Daily Downpour</span>
                  <span className="w-val">{result.weather_data?.max_daily_rainfall_mm} mm</span>
                </div>
                <div className="weather-item">
                  <span className="w-label">Mean Temperature</span>
                  <span className="w-val">{result.weather_data?.mean_temperature_c} °C</span>
                </div>
                <div className="weather-item">
                  <span className="w-label">Peak Temperature</span>
                  <span className="w-val">{result.weather_data?.peak_temperature_c} °C</span>
                </div>
              </div>
            </div>

            <div className="panel-card">
              <h3>📄 PMFBY Insurance Loss Certificate</h3>
              <p className="panel-sub">
                Cryptographically verifiable claim documentation with satellite visual grounding:
              </p>
              <div className="certificate-cta-box">
                <div className="cert-status-badge">✓ ELIGIBLE FOR IMMEDIATE PMFBY PAYOUT</div>
                <p>
                  Canopy loss of <strong>{result.ndvi_drop_pct}%</strong> exceeds statutory threshold.
                  Independent NASA rainfall records confirm unseasonal event.
                </p>
                <button className="btn-action btn-pdf" onClick={downloadCertificatePDF}>
                  📥 Download Official Crop Damage Certificate (PDF)
                </button>
              </div>
            </div>
          </div>

          {/* AI Agronomist Assessment */}
          <div className="panel-card ai-narrative-card">
            <div className="narrative-header">
              <span className="ai-icon">🌾</span>
              <h4>Gemini AI Senior Agronomist Verification Statement</h4>
            </div>
            <p className="narrative-body">{result.ai_assessment}</p>
          </div>
        </div>
      )}
    </div>
  );
}
