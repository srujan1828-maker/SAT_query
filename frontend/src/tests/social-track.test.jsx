// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../components/FloodDashboard", () => ({
  default: () => <div>Flood workspace</div>,
}));
vi.mock("../components/CropDamage", () => ({
  default: () => <div>Crop workspace</div>,
}));
vi.mock("../components/EnvironmentWatch", () => ({
  default: () => <div>Environment workspace</div>,
}));

import SocialTrack from "../components/SocialTrack";

afterEach(cleanup);

it("presents the three social-track initiatives and opens their workspaces", () => {
  render(<SocialTrack />);

  expect(screen.getByRole("heading", { name: /How to Frame SatQuery/ })).toBeTruthy();
  expect(screen.getByText("New Features to Build During the Hackathon")).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Cloud-Penetrating Flood & Infrastructure Triage",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Zero-Cost Crop Loss & Insurance Verifier",
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", {
      name: "Deforestation, Mining & Water Shrinkage Watchdog",
    }),
  ).toBeTruthy();
  expect(screen.getByText("Flood workspace")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /Zero-Cost Crop Loss & Insurance Verifier/ }));
  expect(screen.getByText("Crop workspace")).toBeTruthy();
});
