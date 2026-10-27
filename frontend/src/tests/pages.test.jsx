// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../components/AIMode", () => ({ default: () => <h1>Complete AI Mode</h1> }));
vi.mock("../components/FloodDashboard", () => ({ default: () => <h1>Flood Dispatch</h1> }));
vi.mock("../components/CropDamage", () => ({ default: () => <h1>Crop Damage</h1> }));
vi.mock("../components/EnvironmentWatch", () => ({ default: () => <h1>Environment Watch</h1> }));
vi.mock("../components/SocialTrack", () => ({ default: () => <h1>Social Track</h1> }));
vi.mock("../components/DataSources", () => ({ default: () => <h1>Data Sources</h1> }));
vi.mock("../App", () => ({ default: () => <h1>Satellite Query Workspace</h1> }));

import Pages from "../pages";

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  cleanup();
  history.replaceState({}, "", "/");
});

it("renders global background video in infinite loop across pages", () => {
  const { container } = render(<Pages />);
  const video = container.querySelector(".site-video-element");
  expect(video).toBeTruthy();
  expect(video.getAttribute("src")).toBe("/home.mp4");
  expect(video.hasAttribute("loop")).toBe(true);
  expect(video.hasAttribute("autoplay")).toBe(true);
  expect(video.muted).toBe(true);
});

it("provides linked subpages and supports browser back", async () => {
  history.replaceState({}, "", "/ai");
  render(<Pages />);
  expect(screen.getByRole("heading", { name: "Complete AI Mode" })).toBeTruthy();

  fireEvent.click(screen.getByRole("link", { name: /Flood Dispatch/ }));
  expect(location.pathname).toBe("/flood");
  expect(screen.getByRole("heading", { name: "Flood Dispatch" })).toBeTruthy();

  fireEvent.click(screen.getByRole("link", { name: /Crop Loss Verifier/ }));
  expect(location.pathname).toBe("/crop-damage");
  expect(screen.getByRole("heading", { name: "Crop Damage" })).toBeTruthy();

  fireEvent.click(screen.getByRole("link", { name: /Environmental Watchdog/ }));
  expect(location.pathname).toBe("/environment");
  expect(screen.getByRole("heading", { name: "Environment Watch" })).toBeTruthy();

  fireEvent.click(screen.getByRole("link", { name: "Home" }));
  expect(location.pathname).toBe("/");

  history.replaceState({}, "", "/ai");
  fireEvent.popState(window);
  expect(screen.getByRole("heading", { name: "Complete AI Mode" })).toBeTruthy();
});

it("opens deep links with the correct page", () => {
  history.replaceState({}, "", "/datasets");
  render(<Pages />);
  expect(screen.getByRole("link", { name: /Data sources/i }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("heading", { name: "Data Sources" })).toBeTruthy();
});

it("keeps the existing satellite-query workspace available from the redesigned navigation", () => {
  history.replaceState({}, "", "/");
  render(<Pages />);

  fireEvent.click(screen.getByRole("link", { name: "Satellite Query" }));
  expect(location.pathname).toBe("/query");
  expect(screen.getByRole("heading", { name: "Satellite Query Workspace" })).toBeTruthy();
});

it("opens the landing page and carries a question into AI analysis", () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<Pages />);
  expect(screen.getByRole("heading", { name: /Earth Intelligence/ })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Your satellite question"), { target: { value: "Describe the water" } });
  fireEvent.click(screen.getByRole("button", { name: /Open AI analysis with this question/i }));
  expect(location.pathname).toBe("/ai");
  expect(new URLSearchParams(location.search).get("q")).toBe("Describe the water");
});
