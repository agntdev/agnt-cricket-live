// In-memory cache with provider-specific keys and configurable TTLs.
// Cache keys include the provider name to avoid cross-provider collisions.
// TTLs are tuned per data type: live data refreshes fast, static data longer.

import type {
  LiveUpdateProvider,
  CanonicalMatch,
  CanonicalMatchDetail,
  CanonicalScorecard,
  CanonicalCommentary,
  CanonicalPointsEntry,
  CanonicalPlayerProfile,
  CanonicalTeamInfo,
  ProviderName,
} from "./types.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Default TTLs in milliseconds
const TTL = {
  LIVE_MATCHES: 10_000, // 10s for live match lists
  MATCH_DETAIL: 12_000, // 12s for match details (auto-refresh interval)
  SCORECARD: 12_000, // 12s for scorecard
  COMMENTARY: 10_000, // 10s for ball-by-ball
  POINTS_TABLE: 300_000, // 5min for standings
  SCHEDULE: 60_000, // 1min for schedule
  PLAYER: 300_000, // 5min for player profiles
  TEAM: 300_000, // 5min for team info
} as const;

function cacheKey(provider: ProviderName, method: string, ...args: string[]): string {
  return `${provider}:${method}:${args.join(":")}`;
}

export class CachedProvider implements LiveUpdateProvider {
  readonly name: ProviderName;
  private inner: LiveUpdateProvider;
  private store = new Map<string, CacheEntry<unknown>>();
  private ttls: Record<string, number>;

  constructor(inner: LiveUpdateProvider, ttls?: Partial<typeof TTL>) {
    this.inner = inner;
    this.name = inner.name;
    this.ttls = { ...TTL, ...ttls };
  }

  private get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private set<T>(key: string, value: T, ttl: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  async getMatches(status: "live" | "recent" | "upcoming" | "today"): Promise<CanonicalMatch[]> {
    const key = cacheKey(this.name, "matches", status);
    const cached = this.get<CanonicalMatch[]>(key);
    if (cached) return cached;
    const result = await this.inner.getMatches(status);
    const ttl = status === "live" ? this.ttls.LIVE_MATCHES : this.ttls.SCHEDULE;
    this.set(key, result, ttl);
    return result;
  }

  async getMatchDetail(matchId: string): Promise<CanonicalMatchDetail | null> {
    const key = cacheKey(this.name, "detail", matchId);
    const cached = this.get<CanonicalMatchDetail | null>(key);
    if (cached !== undefined) return cached;
    const result = await this.inner.getMatchDetail(matchId);
    this.set(key, result, this.ttls.MATCH_DETAIL);
    return result;
  }

  async getScorecard(matchId: string): Promise<CanonicalScorecard | null> {
    const key = cacheKey(this.name, "scorecard", matchId);
    const cached = this.get<CanonicalScorecard | null>(key);
    if (cached !== undefined) return cached;
    const result = await this.inner.getScorecard(matchId);
    this.set(key, result, this.ttls.SCORECARD);
    return result;
  }

  async getCommentary(matchId: string): Promise<CanonicalCommentary | null> {
    const key = cacheKey(this.name, "commentary", matchId);
    const cached = this.get<CanonicalCommentary | null>(key);
    if (cached !== undefined) return cached;
    const result = await this.inner.getCommentary(matchId);
    this.set(key, result, this.ttls.COMMENTARY);
    return result;
  }

  async getPointsTable(seriesId?: string): Promise<CanonicalPointsEntry[]> {
    const key = cacheKey(this.name, "points", seriesId ?? "default");
    const cached = this.get<CanonicalPointsEntry[]>(key);
    if (cached) return cached;
    const result = await this.inner.getPointsTable(seriesId);
    this.set(key, result, this.ttls.POINTS_TABLE);
    return result;
  }

  async getSchedule(date?: string, seriesId?: string): Promise<CanonicalMatch[]> {
    const key = cacheKey(this.name, "schedule", date ?? "", seriesId ?? "");
    const cached = this.get<CanonicalMatch[]>(key);
    if (cached) return cached;
    const result = await this.inner.getSchedule(date, seriesId);
    this.set(key, result, this.ttls.SCHEDULE);
    return result;
  }

  async searchPlayer(name: string): Promise<CanonicalPlayerProfile[]> {
    const key = cacheKey(this.name, "player", name.toLowerCase());
    const cached = this.get<CanonicalPlayerProfile[]>(key);
    if (cached) return cached;
    const result = await this.inner.searchPlayer(name);
    this.set(key, result, this.ttls.PLAYER);
    return result;
  }

  async searchTeams(name: string): Promise<CanonicalTeamInfo[]> {
    const key = cacheKey(this.name, "teams", name.toLowerCase());
    const cached = this.get<CanonicalTeamInfo[]>(key);
    if (cached) return cached;
    const result = await this.inner.searchTeams(name);
    this.set(key, result, this.ttls.TEAM);
    return result;
  }

  async getTeamInfo(teamId: string): Promise<CanonicalTeamInfo | null> {
    const key = cacheKey(this.name, "team", teamId);
    const cached = this.get<CanonicalTeamInfo | null>(key);
    if (cached !== undefined) return cached;
    const result = await this.inner.getTeamInfo(teamId);
    this.set(key, result, this.ttls.TEAM);
    return result;
  }
}
