// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../api/query", () => ({
  analyzeCropDamage: vi.fn().mockResolvedValue({
    ndvi_drop_pct: 71,
    damage_severity: "High (Severe Loss)",
    ndvi_before: "0.72",
    ndvi_after: "0.21",
    ai_assessment: "Simulated crop loss validation telemetry",
    certificate_b64: "JVBERi0=",
    weather_data: {
      total_rainfall_mm: 184.2,
      max_daily_rainfall_mm: 82.5,
      mean_temperature_c: 28.4,
    },
  }),
  scrapeCropData: vi.fn().mockResolvedValue({
    district: "Ludhiana",
    state: "Punjab",
    normal_yield_t_ha: 3.8,
  }),
}));

vi.mock("../utils/pdf", () => ({
  printOrSaveCropCertificate: vi.fn(),
}));

import CropDamage from "../components/CropDamage";
import { analyzeCropDamage } from "../api/query";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it("renders the Crop Loss Verifier UI matching the design mockup", () => {
  render(<CropDamage />);

  // Hero Header
  expect(screen.getByRole("heading", { name: /Zero-Cost Crop Loss & Insurance Verifier/ })).toBeTruthy();
  expect(screen.getByText(/Review vegetation and weather indicators/)).toBeTruthy();
  expect(screen.getByText("Support for Farmers")).toBeTruthy();
  expect(screen.getByText(/Satellite evidence for fairer and faster claim assessment/)).toBeTruthy();

  // Left Column Form
  expect(screen.getByText(/1. Farmer \/ Land Information/)).toBeTruthy();
  expect(screen.getByDisplayValue("Gurpreet Singh")).toBeTruthy();
  expect(screen.getByDisplayValue("30.901")).toBeTruthy();
  expect(screen.getByDisplayValue("75.8573")).toBeTruthy();
  expect(screen.getByDisplayValue("Paddy (Rice)")).toBeTruthy();

  expect(screen.getByText(/2. Loss Details/)).toBeTruthy();
  expect(screen.getByLabelText("Reported Peril / Hazard").value).toBe("flood");
  expect(screen.getByDisplayValue("2024-07-25")).toBeTruthy();

  expect(screen.getByText(/3. Voice \/ Telegram Claim/)).toBeTruthy();
  expect(screen.getByText(/Set VITE_TELEGRAM_BOT_USERNAME/)).toBeTruthy();
  expect(screen.getByRole("button", { name: /Verify Crop Damage/ })).toBeTruthy();

  // Center Column Viewport
  expect(screen.getByText("Satellite Analysis")).toBeTruthy();
  expect(screen.getByText("Vegetation Change")).toBeTruthy();
  expect(screen.getByText("Before Event")).toBeTruthy();
  expect(screen.getByText("After Event")).toBeTruthy();
  expect(screen.getByText("NDVI: 0.72")).toBeTruthy();
  expect(screen.getByText("Healthy vegetation")).toBeTruthy();
  expect(screen.getByText("NDVI: 0.21")).toBeTruthy();
  expect(screen.getByText("Severe vegetation loss")).toBeTruthy();

  // Time Series Chart
  expect(screen.getByText("Vegetation Health Time Series (NDVI)")).toBeTruthy();
  expect(screen.getByText("Pre-event (Healthy)")).toBeTruthy();
  expect(screen.getByText("Post-event (Reduced)")).toBeTruthy();
  expect(screen.getByText("Reported Event Date")).toBeTruthy();

  // Additional Data Layers
  expect(screen.getByText("Additional Data Layers")).toBeTruthy();
  expect(screen.getByText("Rainfall (NASA POWER)")).toBeTruthy();
  expect(screen.getByText("Temperature")).toBeTruthy();
  expect(screen.getByText("Soil Moisture")).toBeTruthy();
  expect(screen.getByText("Field Boundary")).toBeTruthy();

  // Right Column
  expect(screen.getByText("Verification Summary")).toBeTruthy();
  expect(screen.getByText("Likely Affected")).toBeTruthy();
  expect(screen.getByText("Key Findings")).toBeTruthy();
  expect(screen.getByText(/Significant reduction in vegetation index/)).toBeTruthy();
  expect(screen.getByText(/Field shows signs of inundation/)).toBeTruthy();
  expect(screen.getByText("Evidence & Data Sources")).toBeTruthy();
  expect(screen.getByText("Sentinel-2")).toBeTruthy();
  expect(screen.getByText("NASA POWER")).toBeTruthy();
  expect(screen.getByText("OpenStreetMap")).toBeTruthy();
});

it("updates farm and farmer details when switching location preset", () => {
  render(<CropDamage />);

  const locationSelect = screen.getByLabelText("Location");
  fireEvent.change(locationSelect, { target: { value: "Vidarbha, Maharashtra" } });

  expect(screen.getByDisplayValue("Anand Shinde")).toBeTruthy();
  expect(screen.getByDisplayValue("20.932")).toBeTruthy();
  expect(screen.getByDisplayValue("77.7523")).toBeTruthy();
  expect(screen.getByDisplayValue("Cotton")).toBeTruthy();
  expect(screen.getByDisplayValue("Severe Drought / Dry Spell")).toBeTruthy();
});

it("submits backend enum values and displays returned screening data", async () => {
  render(<CropDamage />);

  fireEvent.click(screen.getByRole("button", { name: /Verify Crop Damage/ }));
  await waitFor(() => expect(screen.getByText("Backend screening result")).toBeTruthy());
  expect(analyzeCropDamage).toHaveBeenCalledWith(expect.objectContaining({
    damage_type: "flood",
    crop_type: "Paddy (Rice)",
    claim_date: "2024-07-25",
  }));
  expect(screen.getByText("71%")).toBeTruthy();

  // Additional layer modal
  const viewBtns = screen.getAllByRole("button", { name: "View Data" });
  fireEvent.click(viewBtns[0]);
  expect(screen.getByText("NASA POWER Precipitation")).toBeTruthy();

  // Close modal
  fireEvent.click(screen.getByRole("button", { name: "Close details modal" }));
  expect(screen.queryByText("NASA POWER Precipitation")).toBeNull();
});

it("links claimants to the configured Telegram bot", () => {
  vi.stubEnv("VITE_TELEGRAM_BOT_USERNAME", "SatQueryClaimsBot");
  render(<CropDamage />);
  expect(screen.getByRole("link", { name: /Send voice claim in Telegram/ }).href)
    .toBe("https://t.me/SatQueryClaimsBot");
});
