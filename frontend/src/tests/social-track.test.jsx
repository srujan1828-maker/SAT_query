// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../components/FloodDashboard", () => ({
  default: ({ onBack }) => (
    <div>
      <span>Flood workspace</span>
      <button onClick={onBack}>Back from Flood</button>
    </div>
  ),
}));
vi.mock("../components/CropDamage", () => ({
  default: () => <div>Crop workspace</div>,
}));
vi.mock("../components/EnvironmentWatch", () => ({
  default: () => <div>Environment workspace</div>,
}));

import SocialTrack from "../components/SocialTrack";

afterEach(cleanup);

it("presents the social-track initiatives matching the design mockup", () => {
  const navigate = vi.fn();
  render(<SocialTrack navigate={navigate} />);

  expect(screen.getByRole("heading", { name: /Earth Observation/ })).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Disaster Response & Flood Relief",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Agriculture & Rural Welfare",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Environmental Accountability",
    }),
  ).toBeTruthy();

  expect(screen.getByText("Satellite-informed screening")).toBeTruthy();
  expect(screen.getByText("Decision support")).toBeTruthy();
  expect(screen.getByText("Transparent evidence")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByText("Screening workflows")).toBeTruthy();
  expect(screen.getByText("4")).toBeTruthy();
  expect(screen.getByText("Supported crop peril types")).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();
  expect(screen.getByText("Satellite mission inputs")).toBeTruthy();
  expect(screen.getByText("Telegram")).toBeTruthy();
  expect(screen.getByText("Optional claim intake")).toBeTruthy();

  // Test navigation via CTA link
  fireEvent.click(screen.getByRole("link", { name: /Explore Flood Dispatch/ }));
  expect(navigate).toHaveBeenCalledWith(expect.anything(), "/flood");

  fireEvent.click(screen.getByRole("link", { name: /Explore Crop Loss Verifier/ }));
  expect(navigate).toHaveBeenCalledWith(expect.anything(), "/crop-damage");

  fireEvent.click(screen.getByRole("link", { name: /Explore Environmental Watchdog/ }));
  expect(navigate).toHaveBeenCalledWith(expect.anything(), "/environment");
});

it("supports switching to flood section and returning to overview", () => {
  render(<SocialTrack />);

  // Switch to Flood section via subnav tab
  fireEvent.click(screen.getByRole("tab", { name: /01 Flood & Infrastructure Triage/ }));
  expect(screen.getByText("Flood workspace")).toBeTruthy();

  // Return to Overview
  fireEvent.click(screen.getByRole("button", { name: /Back from Flood/ }));
  expect(screen.getByRole("heading", { name: "Disaster Response & Flood Relief" })).toBeTruthy();
});
