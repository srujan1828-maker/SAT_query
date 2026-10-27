// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import DataSources from "../components/DataSources";

afterEach(cleanup);

it("renders the Data Sources directory matching the design mockup", () => {
  render(<DataSources />);

  // Header & Multi-Source Intelligence
  expect(screen.getByRole("heading", { name: /Trusted Data\. Real Impact\./ })).toBeTruthy();
  expect(screen.getByText(/Explore the satellite data, geospatial layers/)).toBeTruthy();
  expect(screen.getByText("Multi-Source Intelligence")).toBeTruthy();

  // Top Stats Ribbon (5 items)
  expect(screen.getByText("8+")).toBeTruthy();
  expect(screen.getAllByText("Satellite Imagery").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Weather Data").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Geospatial Layers").length).toBeGreaterThan(0);
  expect(screen.getByText("Open Data")).toBeTruthy();

  // Left Sidebar Filters
  expect(screen.getByPlaceholderText("Search data sources...")).toBeTruthy();
  expect(screen.getByText("Filter by Category")).toBeTruthy();
  expect(screen.getByText("All Sources")).toBeTruthy();
  expect(screen.getByText("Filter by Access")).toBeTruthy();
  expect(screen.getAllByText("Free & Open").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Requires Account").length).toBeGreaterThan(0);

  // 8 Catalog Cards
  expect(screen.getByRole("heading", { name: "Sentinel-1 SAR" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Sentinel-2" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "NASA POWER" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "OpenStreetMap" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "GPM IMERG" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "SRTM DEM" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "VIIRS Night Lights" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "WorldPop" })).toBeTruthy();

  // Right Sidebar
  expect(screen.getByText("Data Coverage")).toBeTruthy();
  expect(screen.getByText("Temporal Range")).toBeTruthy();
  expect(screen.getByText("Spatial Resolution")).toBeTruthy();
  expect(screen.getByText("Update Frequency")).toBeTruthy();

  expect(screen.getByText("Data Usage")).toBeTruthy();
  expect(screen.getByText("Need a Custom Dataset?")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Request Data" })).toBeTruthy();
});

it("filters datasets dynamically by search query and category", () => {
  render(<DataSources />);

  // Search filter
  const searchInput = screen.getByPlaceholderText("Search data sources...");
  fireEvent.change(searchInput, { target: { value: "rainfall" } });

  expect(screen.getByRole("heading", { name: "NASA POWER" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "GPM IMERG" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Sentinel-1 SAR" })).toBeNull();

  // Clear search
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("heading", { name: "Sentinel-1 SAR" })).toBeTruthy();

  // Category filter
  fireEvent.click(screen.getByRole("radio", { name: /Satellite Imagery/ }));
  expect(screen.getByRole("heading", { name: "Sentinel-1 SAR" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Sentinel-2" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "NASA POWER" })).toBeNull();
});

it("handles dataset request modal interaction", () => {
  render(<DataSources />);

  // Open modal
  fireEvent.click(screen.getByRole("button", { name: "Request Data" }));
  expect(screen.getByText("Request a Custom Dataset")).toBeTruthy();

  // Fill in input and submit
  const input = screen.getByPlaceholderText(/Landsat 9/);
  fireEvent.change(input, { target: { value: "Landsat 9 Thermal" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

  expect(screen.getByText(/Your request for "Landsat 9 Thermal" has been submitted/)).toBeTruthy();
});
