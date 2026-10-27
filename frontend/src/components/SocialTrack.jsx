import React, { useState } from "react";
import FloodDashboard from "./FloodDashboard";
import CropDamage from "./CropDamage";
import EnvironmentWatch from "./EnvironmentWatch";

const initiatives = [
  {
    id: "flood",
    number: "01",
    category: "DISASTER RESPONSE & FLOOD RELIEF",
    title: "Cloud-Penetrating Flood & Infrastructure Triage",
    description:
      "Monsoon cloud cover can hide submerged rural roads, bridges, and villages from rescue teams.",
    feature:
      "Build an Emergency Dispatch Mode that compares pre- and post-disaster Sentinel-1 SAR backscatter, highlights likely inundation, overlays OpenStreetMap roads, and provides routing coordinates for NDRF teams and relief boats.",
  },
  {
    id: "crop",
    number: "02",
    category: "AGRICULTURE & RURAL WELFARE",
    title: "Zero-Cost Crop Loss & Insurance Verifier",
    description:
      "Smallholder farmers can wait months for manual PMFBY inspections after drought, hailstorms, or unseasonal rain.",
    feature:
      "Build a Telegram and voice claim assistant where farmers share a farm GPS pin and describe crop damage. Combine NASA POWER weather data with Sentinel-2 NDVI change detection to generate a verifiable Crop Damage Certificate PDF for insurance claims.",
  },
  {
    id: "environment",
    number: "03",
    category: "ENVIRONMENTAL JUSTICE & CIVIC ACCOUNTABILITY",
    title: "Deforestation, Mining & Water Shrinkage Watchdog",
    description:
      "Communities and journalists often lack accessible evidence of illegal sand mining, forest encroachment, or shrinking lakes and reservoirs.",
    feature:
      "Build an Automated Civic Petition Generator that uses SatQuery change-detection bounds to estimate hectares lost over time, then drafts an evidence-backed RTI or National Green Tribunal (NGT) complaint with before-and-after imagery.",
  },
];

const workspaces = {
  flood: <FloodDashboard />,
  crop: <CropDamage />,
  environment: <EnvironmentWatch />,
};

export default function SocialTrack() {
  const [tab, setTab] = useState("flood");

  return (
    <main className="shell social-track">
      <header className="social-track-heading">
        <p className="eyebrow">INDIA SOCIAL IMPACT &amp; CIVIC TRACK</p>
        <h1>
          How to Frame <span>SatQuery</span>
        </h1>
        <p>
          Turn satellite evidence into practical tools for disaster response,
          rural welfare, and environmental justice.
        </p>
      </header>

      <section aria-labelledby="social-track-initiatives">
        <div className="social-track-section-heading">
          <div>
            <p className="eyebrow">SOCIAL TRACK</p>
            <h2 id="social-track-initiatives">
              New Features to Build During the Hackathon
            </h2>
          </div>
          <p>
            Three community-focused ways to make Earth observation useful on
            the ground.
          </p>
        </div>

        <div className="social-track-grid">
          {initiatives.map((initiative) => (
            <article className="social-track-card card" key={initiative.id}>
              <div className="social-track-card-top">
                <span className="social-track-number">{initiative.number}</span>
                <span className="social-track-category">{initiative.category}</span>
              </div>
              <h3>{initiative.title}</h3>
              <p>{initiative.description}</p>
              <div className="social-track-feature">
                <h4>Hackathon feature</h4>
                <p>{initiative.feature}</p>
              </div>
              <button
                type="button"
                className="social-track-open"
                aria-pressed={tab === initiative.id}
                onClick={() => setTab(initiative.id)}
              >
                Explore workspace <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="social-track-workspace" aria-labelledby="social-track-workspace-title">
        <div className="social-track-section-heading">
          <div>
            <p className="eyebrow">INTERACTIVE WORKSPACES</p>
            <h2 id="social-track-workspace-title">Explore the track</h2>
          </div>
          <p>Select a workspace to explore the current SatQuery workflow.</p>
        </div>

        <div className="social-track-tabs" role="group" aria-label="Social track workspaces">
          {initiatives.map((initiative) => (
            <button
              key={initiative.id}
              type="button"
              aria-pressed={tab === initiative.id}
              onClick={() => setTab(initiative.id)}
            >
              {initiative.title}
            </button>
          ))}
        </div>
        {workspaces[tab]}
      </section>
    </main>
  );
}
