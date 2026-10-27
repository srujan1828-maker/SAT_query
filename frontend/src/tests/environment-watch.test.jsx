// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../api/query", () => ({
  analyzeEnvironment: vi.fn().mockResolvedValue({
    area_changed_hectares: 12.4,
    change_pct: 9.8,
    before_b64: "",
    after_b64: "",
    diff_b64: "",
    bounding_boxes: [{ label: "Candidate change" }],
    ai_narrative: "Environmental screening response",
    petition_b64: "e30=",
  }),
}));

vi.mock("../utils/pdf", () => ({
  printOrSavePetition: vi.fn(),
}));

import EnvironmentWatch from "../components/EnvironmentWatch";
import { analyzeEnvironment } from "../api/query";

afterEach(cleanup);

it("renders the Environmental Watchdog UI matching the design mockup", () => {
  render(<EnvironmentWatch />);

  // Hero Header
  expect(screen.getByRole("heading", { name: /Monitor\. Detect\. Protect\./ })).toBeTruthy();
  expect(screen.getByText(/Review screening results for vegetation, mining, and water-body change/)).toBeTruthy();
  expect(screen.getByText("Preserve Our Ecosystems")).toBeTruthy();
  expect(screen.getByText(/Real-time satellite monitoring for a greener, safer future/)).toBeTruthy();

  // Left Column Form
  expect(screen.getByText(/1\. Select Analysis Type/)).toBeTruthy();
  expect(screen.getByText("Deforestation")).toBeTruthy();
  expect(screen.getByText("Illegal Mining")).toBeTruthy();
  expect(screen.getByText("Water Body Changes")).toBeTruthy();
  expect(screen.getByText("Urban Expansion")).toBeTruthy();

  expect(screen.getByText(/2\. Select Region/)).toBeTruthy();
  expect(screen.getByText("Predefined Areas")).toBeTruthy();
  expect(screen.getByText("Custom Area")).toBeTruthy();
  expect(screen.getByDisplayValue("Chandigarh Surrounding Forests")).toBeTruthy();

  expect(screen.getByText(/3\. Select Date Range/)).toBeTruthy();
  expect(screen.getByDisplayValue("2023-01-01")).toBeTruthy();
  expect(screen.getByDisplayValue("2024-07-01")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Analyze Changes/ })).toBeTruthy();

  // Center Column Viewport & Maps
  expect(screen.getByText("Satellite Analysis")).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Map View" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Before / After" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Time Series" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Change Detection" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Insights" })).toBeTruthy();
  expect(screen.getByText("Forest Cover (2023)")).toBeTruthy();
  expect(screen.getByText("Lost Forest Cover (2024)")).toBeTruthy();

  // Bottom Center Subcards
  expect(screen.getByText("Forest Cover Change (NDVI)")).toBeTruthy();
  expect(screen.getByText("Land Cover Distribution (2024)")).toBeTruthy();
  expect(screen.getByText("Forest")).toBeTruthy();
  expect(screen.getByText("62.3%")).toBeTruthy();
  expect(screen.getByText("Agriculture")).toBeTruthy();
  expect(screen.getByText("18.4%")).toBeTruthy();

  // Right Column Metrics
  expect(screen.getByText("Key Metrics (Selected Area)")).toBeTruthy();
  expect(screen.getAllByText("125.6 km²").length).toBeGreaterThan(0);
  expect(screen.getAllByText("12.4 km²").length).toBeGreaterThan(0);
  expect(screen.getByText("Total area analyzed")).toBeTruthy();
  expect(screen.getByText("Forest loss detected")).toBeTruthy();
  expect(screen.getByText("-9.8%")).toBeTruthy();
  expect(screen.getAllByText("Forest cover change").length).toBeGreaterThan(0);
  expect(screen.getByText("2")).toBeTruthy();
  expect(screen.getByText("Active alerts")).toBeTruthy();

  // Environmental Insights
  expect(screen.getByText("Environmental Insights")).toBeTruthy();
  expect(screen.getByText("High Concern")).toBeTruthy();
  expect(screen.getByText(/Significant forest cover reduction/)).toBeTruthy();
  expect(screen.getByText(/Possible illegal logging activity detected/)).toBeTruthy();

  // Recent Detections
  expect(screen.getByText("Recent Detections")).toBeTruthy();
  expect(screen.getByText("Forest Loss Detected")).toBeTruthy();
  expect(screen.getByText("New Land Disturbance")).toBeTruthy();
  expect(screen.getByText("Water Body Reduction")).toBeTruthy();
});

it("updates metrics when switching regions", () => {
  render(<EnvironmentWatch />);

  const regionSelect = screen.getByLabelText("Preset Region");
  fireEvent.change(regionSelect, { target: { value: "Yamuna Riverbed, Panipat" } });

  expect(screen.getAllByText("94.2 km²").length).toBeGreaterThan(0);
  expect(screen.getAllByText("8.6 km²").length).toBeGreaterThan(0);
  expect(screen.getByText("-12.1%")).toBeTruthy();
  expect(screen.getByText("4")).toBeTruthy();
  expect(screen.getByText("Critical Concern")).toBeTruthy();
});

it("switches analysis type and opens detection modals", () => {
  render(<EnvironmentWatch />);

  // Switch to Illegal Mining
  const miningBtn = screen.getByRole("radio", { name: /Illegal Mining/ });
  fireEvent.click(miningBtn);
  expect(miningBtn.getAttribute("aria-checked")).toBe("true");

  // Open detection modal
  const detectionItem = screen.getByText("New Land Disturbance");
  fireEvent.click(detectionItem);
  expect(screen.getByText("Multi-temporal SAR coherence drop and Sentinel-2 red-edge reflectance shift indicate significant canopy loss. Satellite evidence preserved for National Green Tribunal (NGT) legal filing.")).toBeTruthy();

  // Close modal
  fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
  expect(screen.queryByText("Multi-temporal SAR coherence drop")).toBeNull();
});

it("sends the backend-supported water analysis value and renders its response", async () => {
  render(<EnvironmentWatch />);
  fireEvent.click(screen.getByRole("radio", { name: /Water Body Changes/ }));
  fireEvent.click(screen.getByRole("button", { name: /Analyze Changes/ }));
  await waitFor(() => expect(screen.getByText("Environmental screening response")).toBeTruthy());

  expect(analyzeEnvironment).toHaveBeenCalledWith(expect.objectContaining({
    analysis_type: "water_shrinkage",
    start_date: "2023-01-01",
    end_date: "2024-07-01",
  }));
  expect(screen.getByText("12.4 ha")).toBeTruthy();
});

it("does not offer unsupported urban analysis", () => {
  render(<EnvironmentWatch />);
  expect(screen.getByRole("radio", { name: /Urban Expansion/ }).disabled).toBe(true);
});
