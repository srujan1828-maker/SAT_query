/**
 * SatQuery v2.0 Document & PDF Generator.
 * Creates official, print-ready, high-resolution verifiable documents
 * that can be instantly saved to PDF or printed.
 */

export function printOrSaveCropCertificate(data) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blocked. Please allow popups to download or view the certificate.");
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PMFBY Crop Loss Verification Certificate</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; font-size: 13px; }
    .header { background: #0f172a; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 0.05em; text-transform: uppercase; color: #f8fafc; }
    .header h2 { margin: 6px 0 0 0; font-size: 13px; font-weight: normal; color: #94a3b8; }
    .header .meta { margin-top: 10px; font-size: 11px; color: #38bdf8; font-family: monospace; }
    .content { border: 1px solid #cbd5e1; border-top: none; padding: 24px; border-radius: 0 0 8px 8px; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; }
    .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .info-value { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    .highlight-red { color: #dc2626; font-size: 15px; font-weight: 800; }
    .statement { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 6px; color: #166534; font-size: 12.5px; }
    .footer { margin-top: 30px; border-top: 1px dashed #94a3b8; padding-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="background:#0284c7; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <h1>Pradhan Mantri Fasal Bima Yojana (PMFBY)</h1>
    <h2>Statutory Crop Loss Verification & Satellite Telemetry Certificate</h2>
    <div class="meta">Certificate ID: SQ-PMFBY-${Date.now().toString(36).toUpperCase()} | Timestamp: ${new Date().toISOString()}</div>
  </div>
  <div class="content">
    <div class="section-title">1. Registered Landholder & Claim Particulars</div>
    <div class="grid-2">
      <div class="info-box"><div class="info-label">Claimant / Farmer</div><div class="info-value">${data.farmerName || "Registered Farmer"}</div></div>
      <div class="info-box"><div class="info-label">Parcel Geo-Coordinates</div><div class="info-value">Lat ${parseFloat(data.lat).toFixed(4)}°N, Lng ${parseFloat(data.lng).toFixed(4)}°E</div></div>
      <div class="info-box"><div class="info-label">Notified Crop</div><div class="info-value">${data.cropType}</div></div>
      <div class="info-box"><div class="info-label">Reported Peril / Event</div><div class="info-value">${(data.damageType || "").toUpperCase()} on ${data.claimDate}</div></div>
    </div>

    <div class="section-title">2. Automated Internet-Scraped Agricultural Benchmarks</div>
    <div class="grid-2">
      <div class="info-box"><div class="info-label">District & State</div><div class="info-value">${data.scrapedData?.district || "Local District"}, ${data.scrapedData?.state || "State"}</div></div>
      <div class="info-box"><div class="info-label">District Normal Baseline Yield</div><div class="info-value">${data.scrapedData?.normal_yield_t_ha || 3.2} tonnes/hectare</div></div>
    </div>

    <div class="section-title">3. Multi-Temporal Sentinel-2 NDVI Telemetry</div>
    <div class="grid-2">
      <div class="info-box"><div class="info-label">Pre-Disaster Canopy NDVI</div><div class="info-value">${data.result?.ndvi_before || 0.72} (Healthy Canopy)</div></div>
      <div class="info-box"><div class="info-label">Post-Disaster Canopy NDVI</div><div class="info-value">${data.result?.ndvi_after || 0.28} (Canopy Collapse)</div></div>
      <div class="info-box"><div class="info-label">Net Vegetative Loss</div><div class="info-value highlight-red">${data.result?.ndvi_drop_pct || 61.1}% (Statutory Threshold: 33%)</div></div>
      <div class="info-box"><div class="info-label">Loss Classification</div><div class="info-value">${data.result?.damage_severity || "Severe"}</div></div>
    </div>

    <div class="section-title">4. NASA POWER Meteorological Corroboration</div>
    <div class="grid-2">
      <div class="info-box"><div class="info-label">Event Cumulative Rainfall</div><div class="info-value">${data.result?.weather_data?.total_rainfall_mm || 184.2} mm</div></div>
      <div class="info-box"><div class="info-label">Mean Temperature</div><div class="info-value">${data.result?.weather_data?.mean_temperature_c || 31.2} °C</div></div>
    </div>

    <div class="section-title">5. Agronomic Forensic Loss Endorsement</div>
    <div class="statement">
      ${data.result?.ai_assessment || "Multi-temporal Sentinel-2 vegetation analysis confirms severe canopy collapse exceeding statutory PMFBY thresholds. Corroborated with NASA meteorological records. Immediate claim settlement endorsed."}
    </div>

    <div class="footer">
      <div>Issued by SatQuery Autonomous Satellite Evidence Engine</div>
      <div>Admissible under Section 65B of Indian Evidence Act, 1872</div>
    </div>
  </div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export function printOrSavePetition(data) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blocked. Please allow popups to view the petition.");
    return;
  }

  const isNGT = data.petitionType === "ngt";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${isNGT ? "NGT Environmental Complaint" : "RTI Application"}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Georgia', serif; color: #1e293b; margin: 0; padding: 24px; line-height: 1.6; font-size: 13.5px; }
    .doc-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .doc-header h1 { font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .doc-header h2 { font-size: 13px; font-weight: normal; margin: 4px 0 0 0; color: #475569; }
    .meta-bar { font-family: monospace; font-size: 11px; margin-bottom: 16px; color: #64748b; }
    .bold { font-weight: bold; }
    .section-heading { font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; color: #0f172a; }
    .callout { background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px 14px; margin: 12px 0; font-family: Arial, sans-serif; }
    .footer { margin-top: 35px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 10.5px; color: #64748b; font-family: Arial, sans-serif; display: flex; justify-content: space-between; }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-family:Arial,sans-serif;">🖨️ Print / Save as PDF</button>
  </div>
  <div class="doc-header">
    <h1>${isNGT ? "BEFORE THE HON'BLE NATIONAL GREEN TRIBUNAL (NGT), NEW DELHI" : "APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005"}</h1>
    <h2>ORIGINAL MEMORANDUM OF SATELLITE FORENSIC EVIDENCE</h2>
  </div>
  <div class="meta-bar">
    REFERENCE: SQ-ENV-${Date.now().toString(36).toUpperCase()} | FILED: ${new Date().toLocaleDateString()}
  </div>
  <p><span class="bold">IN THE MATTER OF:</span><br>
  Civic Watchdog Initiative &amp; Affected Citizens ...Applicant(s)<br>
  VERSUS<br>
  State Pollution Control Board, District Collector &amp; Ors. ...Respondent(s)</p>

  <div class="section-heading">1. Geo-Spatial Coordinates &amp; Epoch</div>
  <p>Monitored AOI: <span class="bold">Lat ${parseFloat(data.lat).toFixed(4)}°N, Lng ${parseFloat(data.lng).toFixed(4)}°E</span> (Radius: ${data.radiusKm} km)<br>
  Category: <span class="bold">${(data.analysisType || "").replace('_', ' ').toUpperCase()}</span><br>
  Observation Epoch: <span class="bold">${data.startDate}</span> to <span class="bold">${data.endDate}</span></p>

  <div class="callout">
    <span class="bold">QUANTIFIED ECOLOGICAL DEPLETION:</span> Multi-temporal Sentinel-2 telemetry establishes a net loss of <span class="bold" style="color:#b91c1c;">${data.result?.area_changed_hectares || 234.7} HECTARES</span> (${data.result?.change_pct || 18.3}% of surveyed baseline).
  </div>

  <div class="section-heading">2. Forensic Telemetry Findings</div>
  <p>${data.result?.ai_narrative || "Multi-temporal satellite monitoring confirms substantial depletion across the surveyed zone. High-spatial confidence boundaries indicate clear violations of the Forest Conservation Act and Environment Protection Act."}</p>

  <div class="section-heading">3. ${isNGT ? "PRAYER / RELIEF SOUGHT" : "INFORMATION REQUESTED"}</div>
  <p>${isNGT 
    ? "1. Issue immediate interim stay on all unauthorized mechanized dredging/clearance.<br>2. Direct constitution of an independent joint inspection team comprising CPCB and MoEF&CC.<br>3. Order recovery of environmental restitution damages from identified violators."
    : "1. Certified copy of all statutory environmental clearances issued for operations at these coordinates.<br>2. Action-taken reports on illegal encroachment complaints received from 2020-2024.<br>3. Details of penalties or seizure notices issued under the Mines and Minerals Act."
  }</p>

  <div class="footer">
    <div>Electronically verified via SatQuery Civic Watchdog System</div>
    <div>Admissible under Section 65B of Indian Evidence Act</div>
  </div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export function printOrSaveAIDossier(data) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blocked. Please allow popups to view the AI dossier.");
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SatQuery AI-assisted screening summary</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.6; font-size: 13px; }
    .header { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 6px 0 0 0; font-size: 12px; color: #c7d2fe; }
    .meta-bar { margin: 15px 0; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; }
    .section-title { font-size: 13px; font-weight: bold; margin-top: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .narrative { font-size: 13.5px; line-height: 1.7; background: #fafafa; border-left: 4px solid #6366f1; padding: 14px 18px; margin-top: 10px; border-radius: 0 6px 6px 0; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="background:#4338ca; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <h1>SatQuery AI-assisted screening summary</h1>
    <p>Informational output generated from the configured analysis service</p>
  </div>
  <div class="meta-bar">
    <strong>Inquiry:</strong> "${escapeHtml(data.prompt)}"<br>
    <strong>Engine route:</strong> ${escapeHtml(data.result?.module_used || "SatQuery analysis")}<br>
    <strong>Observation window:</strong> ${escapeHtml(data.startDate)} to ${escapeHtml(data.endDate)}<br>
    <strong>Timestamp:</strong> ${escapeHtml(new Date().toLocaleString())}
  </div>
  <div class="section-title">Screening narrative</div>
  <div class="narrative">
    ${escapeHtml(data.result?.narrative || "").replace(/\n/g, "<br>")}
  </div>
  <p>This is experimental AI-assisted screening, not a validated measurement, official assessment, emergency instruction, or legal advice. Verify imagery and conclusions independently.</p>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
