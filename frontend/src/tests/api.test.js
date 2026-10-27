// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import {
  aiAnalyze,
  analyzeCropDamage,
  analyzeEnvironment,
  analyzeFlood,
  fetchGeocodeSuggestions,
  getFloodRoads,
  getSafeRoute,
  request,
  scrapeCropData,
  submitQuery,
} from "../api/query";
afterEach(() => vi.unstubAllGlobals());
it("uses backend geocode results without external fallback", async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ results: [{ name: "Zero", lat: 0, lon: 0 }] }),
  }));
  vi.stubGlobal("fetch", fetch);
  expect(await fetchGeocodeSuggestions("Zero")).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("shows backend field validation details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      json: async () => ({
        detail: [{ loc: ["body", "date"], msg: "future date" }],
      }),
    })),
  );
  await expect(request("/test")).rejects.toThrow("date: future date");
});
it("resolves a completed job and evidence URLs", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "test-job" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "succeeded",
        result: { images: [{ url: "/media/artifacts/test.png" }] },
        created_at: "2026-01-01",
      }),
    });
  vi.stubGlobal("fetch", fetch);
  const result = await submitQuery({}, new AbortController().signal);
  expect(result.run_id).toBe("test-job");
  expect(result.images[0].url).toContain("/media/artifacts/test.png");
});
it("resolves coordinates without calling the backend", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect(await fetchGeocodeSuggestions("0, 0")).toEqual([expect.objectContaining({ lat: 0, lon: 0 })]);
  await expect(fetchGeocodeSuggestions("91, 180")).rejects.toThrow("latitude");
  expect(fetch).not.toHaveBeenCalled();
});
it("explains network and non-JSON errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(request("/api/geocode?q=test")).rejects.toThrow("Cannot reach");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 502, json: async () => { throw new SyntaxError(); } }));
  await expect(request("/api/geocode?q=test")).rejects.toThrow("unreadable response (502)");
});
it("uses same-origin routing for the deployed Render backend", async () => {
  const { selectApiBase } = await import("../api/query");
  expect(selectApiBase("https://satquery.onrender.com/", "sat-query-six.vercel.app")).toBe("");
  expect(selectApiBase("", "localhost")).toBe("http://127.0.0.1:8000");
  expect(selectApiBase("https://custom.example", "sat-query-six.vercel.app")).toBe("https://custom.example");
});

it("returns backend errors instead of substituting fabricated analysis data", async () => {
  const fetch = vi.fn(async () => ({
    ok: false,
    json: async () => ({ detail: "Backend unavailable" }),
  }));
  vi.stubGlobal("fetch", fetch);

  await expect(analyzeFlood({})).rejects.toThrow("Backend unavailable");
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("uses the current backend routes for feature workflows", async () => {
  const fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ source: "backend" }),
  }));
  vi.stubGlobal("fetch", fetch);

  await analyzeFlood({});
  await getFloodRoads({});
  await getSafeRoute({});
  await analyzeCropDamage({});
  await analyzeEnvironment({});
  await aiAnalyze({});
  await scrapeCropData(10, 20, "rice");

  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    expect.stringContaining("/api/flood/analyze"),
    expect.stringContaining("/api/flood/roads"),
    expect.stringContaining("/api/flood/safe-route"),
    expect.stringContaining("/api/crop-damage/analyze"),
    expect.stringContaining("/api/environment/analyze"),
    expect.stringContaining("/api/ai/analyze"),
    expect.stringContaining("/api/crops/scrape"),
  ]);
});
