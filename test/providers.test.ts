import { describe, expect, it, beforeEach, vi } from "vitest";
import type { LiveUpdateProvider, CanonicalMatch, CanonicalMatchDetail, CanonicalScorecard, CanonicalCommentary, CanonicalPointsEntry, CanonicalPlayerProfile, CanonicalTeamInfo } from "../src/providers/types.js";
import { CachedProvider } from "../src/providers/cache.js";
import { _resetProvider, getProvider } from "../src/providers/index.js";

// ─── Mock provider ─────────────────────────────────────────────────────

function mockProvider(overrides?: Partial<LiveUpdateProvider>): LiveUpdateProvider {
  const defaults: LiveUpdateProvider = {
    name: "cricbuzz",
    getMatches: async () => [],
    getMatchDetail: async () => null,
    getScorecard: async () => null,
    getCommentary: async () => null,
    getPointsTable: async () => [],
    getSchedule: async () => [],
    searchPlayer: async () => [],
    searchTeams: async () => [],
    getTeamInfo: async () => null,
  };
  return { ...defaults, ...overrides };
}

function makeMatch(id: string, status: string = "Live"): CanonicalMatch {
  return {
    matchId: id,
    description: `Match ${id}`,
    team1: { id: "t1", name: "India", shortName: "IND" },
    team2: { id: "t2", name: "Australia", shortName: "AUS" },
    status,
    matchStatus: "live",
    venue: "Mumbai",
  };
}

// ─── Cache tests ───────────────────────────────────────────────────────

describe("CachedProvider", () => {
  it("caches getMatches results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getMatches: async () => { callCount++; return [makeMatch("1")]; },
    });
    const cached = new CachedProvider(inner);

    const r1 = await cached.getMatches("live");
    expect(r1).toHaveLength(1);
    expect(callCount).toBe(1);

    const r2 = await cached.getMatches("live");
    expect(r2).toHaveLength(1);
    expect(callCount).toBe(1); // not called again
  });

  it("caches getMatchDetail results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getMatchDetail: async () => { callCount++; return { ...makeMatch("1"), innings: [] }; },
    });
    const cached = new CachedProvider(inner);

    await cached.getMatchDetail("1");
    await cached.getMatchDetail("1");
    expect(callCount).toBe(1);
  });

  it("caches getScorecard results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getScorecard: async () => { callCount++; return { matchId: "1", scorecard: [] }; },
    });
    const cached = new CachedProvider(inner);

    await cached.getScorecard("1");
    await cached.getScorecard("1");
    expect(callCount).toBe(1);
  });

  it("caches getCommentary results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getCommentary: async () => { callCount++; return { matchId: "1", commentaryList: [] }; },
    });
    const cached = new CachedProvider(inner);

    await cached.getCommentary("1");
    await cached.getCommentary("1");
    expect(callCount).toBe(1);
  });

  it("caches getPointsTable results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getPointsTable: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.getPointsTable();
    await cached.getPointsTable();
    expect(callCount).toBe(1);
  });

  it("caches getSchedule results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getSchedule: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.getSchedule();
    await cached.getSchedule();
    expect(callCount).toBe(1);
  });

  it("caches searchPlayer results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      searchPlayer: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.searchPlayer("Kohli");
    await cached.searchPlayer("Kohli");
    expect(callCount).toBe(1);
  });

  it("different search terms hit different cache entries", async () => {
    let callCount = 0;
    const inner = mockProvider({
      searchPlayer: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.searchPlayer("Kohli");
    await cached.searchPlayer("Rohit");
    expect(callCount).toBe(2);
  });

  it("caches searchTeams results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      searchTeams: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.searchTeams("India");
    await cached.searchTeams("India");
    expect(callCount).toBe(1);
  });

  it("caches getTeamInfo results", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getTeamInfo: async () => { callCount++; return { teamId: "1", teamName: "India" }; },
    });
    const cached = new CachedProvider(inner);

    await cached.getTeamInfo("1");
    await cached.getTeamInfo("1");
    expect(callCount).toBe(1);
  });

  it("different status values hit different cache entries for getMatches", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getMatches: async () => { callCount++; return []; },
    });
    const cached = new CachedProvider(inner);

    await cached.getMatches("live");
    await cached.getMatches("recent");
    expect(callCount).toBe(2);
  });

  it("cache entries expire after TTL", async () => {
    let callCount = 0;
    const inner = mockProvider({
      getMatches: async () => { callCount++; return [makeMatch("1")]; },
    });
    // Use a very short TTL for testing
    const cached = new CachedProvider(inner, { LIVE_MATCHES: 1 });

    await cached.getMatches("live");
    expect(callCount).toBe(1);

    // Wait for cache to expire
    await new Promise((r) => setTimeout(r, 10));

    await cached.getMatches("live");
    expect(callCount).toBe(2); // called again after expiry
  });

  it("passes provider name through", () => {
    const inner = mockProvider({ name: "cricapi" });
    const cached = new CachedProvider(inner);
    expect(cached.name).toBe("cricapi");
  });
});

// ─── Provider factory tests ────────────────────────────────────────────

describe("getProvider factory", () => {
  beforeEach(() => {
    _resetProvider();
  });

  it("defaults to cricbuzz when no env vars set", () => {
    const provider = getProvider({});
    expect(provider.name).toBe("cricbuzz");
  });

  it("uses cricbuzz when LIVE_UPDATE_PROVIDER=cricbuzz", () => {
    const provider = getProvider({ LIVE_UPDATE_PROVIDER: "cricbuzz" });
    expect(provider.name).toBe("cricbuzz");
  });

  it("falls back to cricbuzz for unknown provider name", () => {
    const provider = getProvider({ LIVE_UPDATE_PROVIDER: "unknown" });
    expect(provider.name).toBe("cricbuzz");
  });

  it("creates HttpProviderAdapter for cricapi with API URL", () => {
    const provider = getProvider({
      LIVE_UPDATE_PROVIDER: "cricapi",
      LIVE_UPDATE_API_URL: "https://api.cricapi.com/v1",
    });
    expect(provider.name).toBe("cricapi");
  });

  it("creates HttpProviderAdapter for sportradar with API URL", () => {
    const provider = getProvider({
      LIVE_UPDATE_PROVIDER: "sportradar",
      LIVE_UPDATE_API_URL: "https://api.sportradar.com/cricket",
    });
    expect(provider.name).toBe("sportradar");
  });

  it("creates HttpProviderAdapter for cricketdata with API URL", () => {
    const provider = getProvider({
      LIVE_UPDATE_PROVIDER: "cricketdata",
      LIVE_UPDATE_API_URL: "https://api.cricketdata.org/v1",
    });
    expect(provider.name).toBe("cricketdata");
  });

  it("creates HttpProviderAdapter for custom with API URL", () => {
    const provider = getProvider({
      LIVE_UPDATE_PROVIDER: "custom",
      LIVE_UPDATE_API_URL: "https://my-custom-api.com/cricket",
    });
    expect(provider.name).toBe("custom");
  });

  it("caches the provider instance", () => {
    const p1 = getProvider({});
    const p2 = getProvider({});
    expect(p1).toBe(p2);
  });

  it("_resetProvider clears the cache", () => {
    const p1 = getProvider({});
    _resetProvider();
    const p2 = getProvider({});
    expect(p1).not.toBe(p2);
  });
});

// ─── Cricbuzz adapter tests ────────────────────────────────────────────

describe("CricbuzzAdapter", () => {
  it("exports with correct name", async () => {
    const { CricbuzzAdapter } = await import("../src/providers/cricbuzz.js");
    const adapter = new CricbuzzAdapter();
    expect(adapter.name).toBe("cricbuzz");
  });
});

// ─── HTTP adapter tests ────────────────────────────────────────────────

describe("HttpProviderAdapter", () => {
  it("exports with correct name", async () => {
    const { HttpProviderAdapter } = await import("../src/providers/http-adapter.js");
    const adapter = new HttpProviderAdapter({ name: "cricapi", baseUrl: "https://api.cricapi.com/v1" });
    expect(adapter.name).toBe("cricapi");
  });
});
