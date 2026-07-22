// Provider factory — selects and wires the primary and secondary providers
// from environment variables, wraps them in caching, and implements
// fallback logic with exponential backoff.

import type { LiveUpdateProvider, ProviderName } from "./types.js";
import { CricbuzzAdapter } from "./cricbuzz.js";
import { HttpProviderAdapter } from "./http-adapter.js";
import { CachedProvider } from "./cache.js";

const VALID_PROVIDERS: ProviderName[] = ["cricbuzz", "cricapi", "sportradar", "cricketdata", "custom"];

interface ProviderEnv {
  LIVE_UPDATE_PROVIDER?: string;
  LIVE_UPDATE_API_URL?: string;
  LIVE_UPDATE_API_KEY?: string;
  SECONDARY_LIVE_UPDATE_PROVIDER?: string;
  SECONDARY_LIVE_UPDATE_API_URL?: string;
  SECONDARY_LIVE_UPDATE_API_KEY?: string;
}

function isValidProvider(name: string): name is ProviderName {
  return VALID_PROVIDERS.includes(name as ProviderName);
}

function buildProvider(
  name: ProviderName,
  apiUrl?: string,
  apiKey?: string,
): LiveUpdateProvider {
  switch (name) {
    case "cricbuzz":
      return new CricbuzzAdapter();
    case "cricapi":
    case "sportradar":
    case "cricketdata":
    case "custom":
      if (!apiUrl) {
        throw new Error(
          `Provider "${name}" requires LIVE_UPDATE_API_URL to be set.`,
        );
      }
      return new HttpProviderAdapter({ name, baseUrl: apiUrl, apiKey });
  }
}

// ─── Exponential backoff retry ─────────────────────────────────────────

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Fallback provider wrapper ─────────────────────────────────────────

type ProviderMethod =
  | "getMatches"
  | "getMatchDetail"
  | "getScorecard"
  | "getCommentary"
  | "getPointsTable"
  | "getSchedule"
  | "searchPlayer"
  | "searchTeams"
  | "getTeamInfo";

class FallbackProvider implements LiveUpdateProvider {
  readonly name: ProviderName;
  private primary: LiveUpdateProvider;
  private secondary: LiveUpdateProvider;

  constructor(primary: LiveUpdateProvider, secondary: LiveUpdateProvider) {
    this.name = primary.name;
    this.primary = primary;
    this.secondary = secondary;
  }

  private async tryWithFallback<T>(
    method: ProviderMethod,
    args: unknown[],
  ): Promise<T> {
    try {
      const fn = (this.primary[method] as (...a: unknown[]) => Promise<T>).bind(this.primary);
      return await withBackoff(() => fn(...args));
    } catch (primaryErr) {
      console.warn(
        `[provider] Primary (${this.primary.name}) failed on ${method}, trying secondary (${this.secondary.name}):`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr,
      );
      try {
        const fn = (this.secondary[method] as (...a: unknown[]) => Promise<T>).bind(this.secondary);
        return await withBackoff(() => fn(...args));
      } catch (secondaryErr) {
        console.error(
          `[provider] Secondary (${this.secondary.name}) also failed on ${method}:`,
          secondaryErr instanceof Error ? secondaryErr.message : secondaryErr,
        );
        throw secondaryErr;
      }
    }
  }

  async getMatches(status: "live" | "recent" | "upcoming" | "today") {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getMatches"]>>("getMatches", [status]);
  }

  async getMatchDetail(matchId: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getMatchDetail"]>>("getMatchDetail", [matchId]);
  }

  async getScorecard(matchId: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getScorecard"]>>("getScorecard", [matchId]);
  }

  async getCommentary(matchId: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getCommentary"]>>("getCommentary", [matchId]);
  }

  async getPointsTable(seriesId?: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getPointsTable"]>>("getPointsTable", [seriesId]);
  }

  async getSchedule(date?: string, seriesId?: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getSchedule"]>>("getSchedule", [date, seriesId]);
  }

  async searchPlayer(name: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["searchPlayer"]>>("searchPlayer", [name]);
  }

  async searchTeams(name: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["searchTeams"]>>("searchTeams", [name]);
  }

  async getTeamInfo(teamId: string) {
    return this.tryWithFallback<ReturnType<LiveUpdateProvider["getTeamInfo"]>>("getTeamInfo", [teamId]);
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

let cachedInstance: LiveUpdateProvider | null = null;

/**
 * Get the configured live-update provider. Reads from env vars once and
 * caches the result. Falls back to Cricbuzz when no provider is configured.
 */
export function getProvider(env: ProviderEnv = typeof process !== "undefined" ? process.env : {}): LiveUpdateProvider {
  if (cachedInstance) return cachedInstance;

  const primaryName = env.LIVE_UPDATE_PROVIDER ?? "cricbuzz";
  if (!isValidProvider(primaryName)) {
    console.warn(`[provider] Unknown provider "${primaryName}", falling back to cricbuzz`);
  }
  const primary = buildProvider(
    isValidProvider(primaryName) ? primaryName : "cricbuzz",
    env.LIVE_UPDATE_API_URL,
    env.LIVE_UPDATE_API_KEY,
  );

  let provider: LiveUpdateProvider = primary;

  const secondaryName = env.SECONDARY_LIVE_UPDATE_PROVIDER;
  if (secondaryName && isValidProvider(secondaryName) && secondaryName !== primaryName) {
    try {
      const secondary = buildProvider(
        secondaryName,
        env.SECONDARY_LIVE_UPDATE_API_URL,
        env.SECONDARY_LIVE_UPDATE_API_KEY,
      );
      provider = new FallbackProvider(primary, secondary);
    } catch (err) {
      console.warn(
        `[provider] Could not init secondary provider "${secondaryName}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  cachedInstance = new CachedProvider(provider);
  return cachedInstance;
}

/** Reset the cached provider instance (test-only hook). */
export function _resetProvider(): void {
  cachedInstance = null;
}

// Re-export types and adapters for direct use
export type { LiveUpdateProvider, ProviderName } from "./types.js";
export type { CanonicalMatch, CanonicalMatchDetail, CanonicalScorecard, CanonicalCommentary, CanonicalPointsEntry, CanonicalPlayerProfile, CanonicalTeamInfo } from "./types.js";
