// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../api/query", () => ({
  analyzeFlood: vi.fn().mockResolvedValue({
    affected_area_km2: 30.5,
    severity_level: "High",
    submerged_zones: [[[92.9, 26.2], [92.91, 26.21], [92.9, 26.2]]],
    road_status: [{ name: "Road 1", status: "Submerged" }],
    summary: "Simulated flood triage summary",
  }),
  getSafeRoute: vi.fn().mockResolvedValue({
    distance_km: 12.4,
    estimated_time: "25 min",
    avoid_zones: ["Submerged Zone A"],
  }),
}));

import FloodDashboard from "../components/FloodDashboard";
import { analyzeFlood } from "../api/query";

afterEach(cleanup);

it("renders the Flood & Infrastructure Triage UI matching the design mockup", () => {
  render(<FloodDashboard />);

  expect(screen.getByRole("heading", { name: /Cloud-Penetrating Flood & Infrastructure Triage/ })).toBeTruthy();
  expect(screen.getByText(/Sentinel-1 SAR data/)).toBeTruthy();
  expect(screen.getByText("Emergency Hotspots")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Brahmaputra Basin, Assam/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Yamuna Floodplains, Delhi/ })).toBeTruthy();

  // Check Analysis Parameters
  expect(screen.getByRole("heading", { name: "Analysis Parameters" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Execute Flood Triage/ })).toBeTruthy();

  // Check Satellite View
  expect(screen.getByRole("heading", { name: /Satellite View/ })).toBeTruthy();
  expect(screen.getByText("Detected Water (Inundation)")).toBeTruthy();

  // Check 4 Metrics Gauges
  expect(screen.getAllByText("28.6 km²").length).toBeGreaterThan(0);
  expect(screen.getByText("Estimated flood area")).toBeTruthy();
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("Affected villages (sample)")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByText("Critical bridges (sample)")).toBeTruthy();
  expect(screen.getByText("5")).toBeTruthy();
  expect(screen.getByText("Road segments (sample)")).toBeTruthy();

  // Check new Impact Assessment and Data Sources
  expect(screen.getByText("Impact Assessment")).toBeTruthy();
  expect(screen.getByText("Illustrative")).toBeTruthy();
  expect(screen.getByText("Data Sources")).toBeTruthy();
  expect(screen.getByText("Before vs After (SAR)")).toBeTruthy();
  expect(screen.getByText("Flood Extent Trend")).toBeTruthy();
});

it("updates parameters and stats when selecting an emergency hotspot", () => {
  render(<FloodDashboard />);

  fireEvent.click(screen.getByRole("button", { name: /Yamuna Floodplains, Delhi/ }));
  expect(screen.getByText("19.4 km²")).toBeTruthy();
  expect(screen.getByText("8")).toBeTruthy();
  expect(screen.getByDisplayValue("28.6692")).toBeTruthy();
  expect(screen.getByDisplayValue("77.2435")).toBeTruthy();
});

it("sends backend request fields and displays the returned screening", async () => {
  render(<FloodDashboard />);
  fireEvent.click(screen.getByRole("button", { name: /Execute Flood Triage/ }));
  await waitFor(() => expect(screen.getByText("Backend screening result")).toBeTruthy());

  expect(analyzeFlood).toHaveBeenCalledWith(expect.objectContaining({
    lat: 26.2006,
    lng: 92.9376,
    radius_km: 5,
    pre_date: "2024-05-15",
    post_date: "2024-07-07",
  }));
  expect(screen.getAllByText("Simulated flood triage summary").length).toBeGreaterThan(0);
  expect(screen.getByText("Candidate inundation zones")).toBeTruthy();
  expect(screen.getByText("Bridge impact not returned by the API")).toBeTruthy();
});
