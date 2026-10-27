// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../api/query", () => ({
  aiAnalyze: vi.fn().mockResolvedValue({
    intent: "flood_analysis",
    module_used: "Emergency Flood Dispatch",
    result: {
      affected_area_km2: 32.1,
      severity_level: "High",
      submerged_zones: [[[1, 2], [2, 3]]],
      road_status: [{ status: "unverified" }],
    },
    narrative: "Backend screening summary",
  }),
}));

vi.mock("../utils/pdf", () => ({
  printOrSaveAIDossier: vi.fn(),
}));

import AIMode from "../components/AIMode";
import { printOrSaveAIDossier } from "../utils/pdf";

afterEach(cleanup);

it("renders the Complete AI Mode dashboard matching the mockup", () => {
  render(<AIMode />);

  expect(screen.getByRole("heading", { name: /Ask\. Analyze\. Understand\./ })).toBeTruthy();
  expect(screen.getByText("COMPLETE AI MODE")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Your Query" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Analyze" })).toBeTruthy();

  // Check center tabs
  expect(screen.getByRole("tab", { name: "Map View" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Before / After" })).toBeTruthy();
  expect(screen.getByText("Analysis Area")).toBeTruthy();

  // Check Analysis Results
  expect(screen.getByRole("heading", { name: "Analysis Results" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Export Report/ }).disabled).toBe(true);
  expect(screen.getByText(/No backend result yet/)).toBeTruthy();
  expect(screen.queryByText("28.6 km²")).toBeNull();

  // Check Bottom Progress Bar
  expect(screen.getByText("Analysis Progress")).toBeTruthy();
  expect(screen.getByText("1. Interpret Query")).toBeTruthy();
  expect(screen.getByText("2. Fetch Data")).toBeTruthy();
  expect(screen.getByText("3. Analyze")).toBeTruthy();
  expect(screen.getByText("4. Generate Insights")).toBeTruthy();
});

it("selects an example prompt without displaying its illustrative results as live", () => {
  render(<AIMode />);

  fireEvent.click(
    screen.getByRole("button", {
      name: /Compare pre and post images of a lake/,
    })
  );

  expect(screen.getByLabelText("Your Query Description").value).toBe("Compare pre and post images of a lake");
  expect(screen.getByText(/No backend result yet/)).toBeTruthy();
  expect(screen.queryByText("4.2 km²")).toBeNull();
});

it("sends a backend-compatible prompt and exports the returned analysis", async () => {
  render(<AIMode />);

  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
  await waitFor(() => expect(screen.getByText("Backend screening summary")).toBeTruthy());
  expect(screen.getAllByText("32.1 km²").length).toBeGreaterThan(0);
  expect(screen.getByText("Emergency Flood Dispatch")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Export Report/ }));
  expect(printOrSaveAIDossier).toHaveBeenCalled();
});
