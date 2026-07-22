// Generic HTTP-based provider adapter for configurable live-update providers.
// Supports cricapi, sportradar, cricketdata, and custom providers via
// LIVE_UPDATE_API_URL and LIVE_UPDATE_API_KEY environment variables.

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

interface HttpProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKey?: string;
}

async function fetchProviderJson<T>(url: string, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "AGNTDEV-CricketBot/1.0",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-Api-Key"] = apiKey;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Provider API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export class HttpProviderAdapter implements LiveUpdateProvider {
  readonly name: ProviderName;
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: HttpProviderConfig) {
    this.name = config.name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  private url(path: string, params?: Record<string, string>): string {
    const u = new URL(`${this.baseUrl}${path}`);
    if (this.apiKey) u.searchParams.set("apikey", this.apiKey);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) u.searchParams.set(k, v);
      }
    }
    return u.toString();
  }

  async getMatches(_status: "live" | "recent" | "upcoming" | "today"): Promise<CanonicalMatch[]> {
    try {
      const data = await fetchProviderJson<{
        matches?: Array<Record<string, unknown>>;
        data?: Array<Record<string, unknown>>;
        result?: Array<Record<string, unknown>>;
      }>(this.url("/matches"));
      const raw = data.matches ?? data.data ?? data.result ?? [];
      return raw.map((m) => this.normalizeMatch(m));
    } catch {
      return [];
    }
  }

  async getMatchDetail(matchId: string): Promise<CanonicalMatchDetail | null> {
    try {
      const data = await fetchProviderJson<Record<string, unknown>>(
        this.url(`/matches/${matchId}`),
      );
      return this.normalizeMatchDetail(data);
    } catch {
      return null;
    }
  }

  async getScorecard(matchId: string): Promise<CanonicalScorecard | null> {
    try {
      const data = await fetchProviderJson<Record<string, unknown>>(
        this.url(`/matches/${matchId}/scorecard`),
      );
      return this.normalizeScorecard(matchId, data);
    } catch {
      return null;
    }
  }

  async getCommentary(matchId: string): Promise<CanonicalCommentary | null> {
    try {
      const data = await fetchProviderJson<Record<string, unknown>>(
        this.url(`/matches/${matchId}/commentary`),
      );
      return this.normalizeCommentary(matchId, data);
    } catch {
      return null;
    }
  }

  async getPointsTable(_seriesId?: string): Promise<CanonicalPointsEntry[]> {
    try {
      const data = await fetchProviderJson<{
        points?: Array<Record<string, unknown>>;
        table?: Array<Record<string, unknown>>;
      }>(this.url("/points-table"));
      const raw = data.points ?? data.table ?? [];
      return raw.map((e, i) => ({
        teamId: String(e.teamId ?? e.id ?? ""),
        teamName: String(e.teamName ?? e.name ?? ""),
        matches: Number(e.matches ?? 0),
        won: Number(e.won ?? 0),
        lost: Number(e.lost ?? 0),
        tied: Number(e.tied ?? 0),
        nrr: e.nrr != null ? String(e.nrr) : undefined,
        points: Number(e.points ?? 0),
        pos: Number(e.pos ?? i + 1),
      }));
    } catch {
      return [];
    }
  }

  async getSchedule(_date?: string, _seriesId?: string): Promise<CanonicalMatch[]> {
    try {
      const data = await fetchProviderJson<{
        matches?: Array<Record<string, unknown>>;
        schedule?: Array<Record<string, unknown>>;
      }>(this.url("/schedule"));
      const raw = data.matches ?? data.schedule ?? [];
      return raw.map((m) => this.normalizeMatch(m));
    } catch {
      return [];
    }
  }

  async searchPlayer(name: string): Promise<CanonicalPlayerProfile[]> {
    try {
      const data = await fetchProviderJson<{
        players?: Array<Record<string, unknown>>;
        data?: Array<Record<string, unknown>>;
      }>(this.url("/players/search", { q: name }));
      const raw = data.players ?? data.data ?? [];
      return raw.map((p) => ({
        playerId: String(p.playerId ?? p.id ?? ""),
        playerName: String(p.playerName ?? p.name ?? ""),
        country: p.country != null ? String(p.country) : undefined,
        battingStyle: p.battingStyle != null ? String(p.battingStyle) : undefined,
        bowlingStyle: p.bowlingStyle != null ? String(p.bowlingStyle) : undefined,
        playerType: p.playerType != null ? String(p.playerType) : undefined,
      }));
    } catch {
      return [];
    }
  }

  async searchTeams(name: string): Promise<CanonicalTeamInfo[]> {
    try {
      const data = await fetchProviderJson<{
        teams?: Array<Record<string, unknown>>;
        data?: Array<Record<string, unknown>>;
      }>(this.url("/teams/search", { q: name }));
      const raw = data.teams ?? data.data ?? [];
      return raw.map((t) => ({
        teamId: String(t.teamId ?? t.id ?? ""),
        teamName: String(t.teamName ?? t.name ?? ""),
        squad: Array.isArray(t.squad)
          ? (t.squad as Array<Record<string, unknown>>).map((p) => ({
              playerId: String(p.playerId ?? p.id ?? ""),
              playerName: String(p.playerName ?? p.name ?? ""),
              playerType: p.playerType != null ? String(p.playerType) : undefined,
            }))
          : undefined,
        results: Array.isArray(t.results)
          ? (t.results as Array<Record<string, unknown>>).map((r) => ({
              matchDescription: String(r.matchDescription ?? r.description ?? ""),
              result: String(r.result ?? ""),
            }))
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  async getTeamInfo(teamId: string): Promise<CanonicalTeamInfo | null> {
    try {
      const data = await fetchProviderJson<Record<string, unknown>>(
        this.url(`/teams/${teamId}`),
      );
      return {
        teamId: String(data.teamId ?? data.id ?? teamId),
        teamName: String(data.teamName ?? data.name ?? ""),
        squad: Array.isArray(data.squad)
          ? (data.squad as Array<Record<string, unknown>>).map((p) => ({
              playerId: String(p.playerId ?? p.id ?? ""),
              playerName: String(p.playerName ?? p.name ?? ""),
              playerType: p.playerType != null ? String(p.playerType) : undefined,
            }))
          : undefined,
        results: Array.isArray(data.results)
          ? (data.results as Array<Record<string, unknown>>).map((r) => ({
              matchDescription: String(r.matchDescription ?? r.description ?? ""),
              result: String(r.result ?? ""),
            }))
          : undefined,
      };
    } catch {
      return null;
    }
  }

  private normalizeMatch(raw: Record<string, unknown>): CanonicalMatch {
    const t1 = (raw.team1 ?? raw.teamA ?? {}) as Record<string, unknown>;
    const t2 = (raw.team2 ?? raw.teamB ?? {}) as Record<string, unknown>;
    return {
      matchId: String(raw.matchId ?? raw.id ?? ""),
      description: String(raw.matchDescription ?? raw.description ?? raw.name ?? ""),
      team1: {
        id: String(t1.id ?? ""),
        name: String(t1.name ?? t1.teamName ?? ""),
        shortName: String(t1.shortName ?? t1.abbreviation ?? t1.name ?? ""),
      },
      team2: {
        id: String(t2.id ?? ""),
        name: String(t2.name ?? t2.teamName ?? ""),
        shortName: String(t2.shortName ?? t2.abbreviation ?? t2.name ?? ""),
      },
      status: String(raw.status ?? raw.matchStatus ?? ""),
      matchStatus: this.classifyMatchStatus(raw),
      venue: String(raw.venue ?? raw.ground ?? ""),
      tossWinner: raw.tossWinner != null ? String(raw.tossWinner) : undefined,
      tossDecision: raw.tossDecision != null ? String(raw.tossDecision) : undefined,
      startTime: raw.startTime != null ? String(raw.startTime) : undefined,
      matchType: raw.matchType != null ? String(raw.matchType) : undefined,
      seriesName: raw.seriesName != null ? String(raw.seriesName) : undefined,
    };
  }

  private classifyMatchStatus(raw: Record<string, unknown>): "live" | "upcoming" | "recent" | "today" {
    const s = String(raw.status ?? raw.matchStatus ?? "").toLowerCase();
    if (s.includes("progress") || s.includes("live") || s === "1") return "live";
    if (s.includes("complete") || s.includes("finished") || s.includes("result") || s === "3") return "recent";
    if (s.includes("upcoming") || s.includes("not started") || s === "0") return "upcoming";
    return "today";
  }

  private normalizeMatchDetail(raw: Record<string, unknown>): CanonicalMatchDetail {
    const base = this.normalizeMatch(raw);
    const innings = Array.isArray(raw.innings)
      ? (raw.innings as Array<Record<string, unknown>>).map((inn) => ({
          inningsId: Number(inn.inningsId ?? inn.id ?? 0),
          teamId: String(inn.teamId ?? ""),
          teamName: String(inn.teamName ?? ""),
          runs: Number(inn.runs ?? 0),
          wickets: Number(inn.wickets ?? 0),
          overs: Number(inn.overs ?? 0),
          balls: inn.balls != null ? Number(inn.balls) : undefined,
          runRate: inn.runRate != null ? Number(inn.runRate) : undefined,
          requiredRunRate: inn.requiredRunRate != null ? Number(inn.requiredRunRate) : undefined,
        }))
      : undefined;
    return {
      ...base,
      innings,
      umpires: Array.isArray(raw.umpires)
        ? (raw.umpires as unknown[]).map(String)
        : raw.umpires != null
          ? [String(raw.umpires)]
          : undefined,
      referee: raw.referee != null ? String(raw.referee) : undefined,
      result: raw.result != null ? String(raw.result) : undefined,
    };
  }

  private normalizeScorecard(matchId: string, raw: Record<string, unknown>): CanonicalScorecard {
    const scorecard = Array.isArray(raw.scorecard)
      ? (raw.scorecard as Array<Record<string, unknown>>).map((inn) => ({
          inningsId: Number(inn.inningsId ?? inn.id ?? 0),
          teamId: String(inn.teamId ?? ""),
          teamName: String(inn.teamName ?? ""),
          runs: Number(inn.runs ?? 0),
          wickets: Number(inn.wickets ?? 0),
          overs: Number(inn.overs ?? 0),
          extras: inn.extras != null ? Number(inn.extras) : undefined,
          batsmen: Array.isArray(inn.batsmen)
            ? (inn.batsmen as Array<Record<string, unknown>>).map((b) => ({
                batterId: String(b.batterId ?? b.id ?? ""),
                batterName: String(b.batterName ?? b.name ?? ""),
                runs: Number(b.runs ?? 0),
                balls: Number(b.balls ?? 0),
                fours: Number(b.fours ?? 0),
                sixes: Number(b.sixes ?? 0),
                strikeRate: Number(b.strikeRate ?? 0),
                dismissal: b.dismissal != null ? String(b.dismissal) : undefined,
                bowler: b.bowler != null ? String(b.bowler) : undefined,
              }))
            : undefined,
          bowlers: Array.isArray(inn.bowlers)
            ? (inn.bowlers as Array<Record<string, unknown>>).map((b) => ({
                bowlerId: String(b.bowlerId ?? b.id ?? ""),
                bowlerName: String(b.bowlerName ?? b.name ?? ""),
                overs: Number(b.overs ?? 0),
                maidens: Number(b.maidens ?? 0),
                runs: Number(b.runs ?? 0),
                wickets: Number(b.wickets ?? 0),
                economy: Number(b.economy ?? 0),
                extras: b.extras != null ? Number(b.extras) : undefined,
              }))
            : undefined,
          fallOfWickets: Array.isArray(inn.fallOfWickets)
            ? (inn.fallOfWickets as Array<Record<string, unknown>>).map((f) => ({
                runs: Number(f.runs ?? 0),
                wickets: Number(f.wickets ?? 0),
                batter: String(f.batter ?? ""),
                overs: Number(f.overs ?? 0),
              }))
            : undefined,
        }))
      : undefined;
    return { matchId, scorecard };
  }

  private normalizeCommentary(matchId: string, raw: Record<string, unknown>): CanonicalCommentary {
    const commentaryList = Array.isArray(raw.commentaryList ?? raw.commentary)
      ? (raw.commentaryList ?? raw.commentary) as Array<Record<string, unknown>>
      : undefined;
    return {
      matchId,
      commentaryList: commentaryList?.map((c) => ({
        overNum: Number(c.overNum ?? c.over ?? 0),
        ballNum: c.ballNum != null ? Number(c.ballNum) : undefined,
        commentary: String(c.commentary ?? c.text ?? ""),
        batsman: c.batsman != null
          ? { name: String((c.batsman as Record<string, unknown>).name ?? ""), runs: (c.batsman as Record<string, unknown>).runs != null ? Number((c.batsman as Record<string, unknown>).runs) : undefined }
          : undefined,
        bowler: c.bowler != null
          ? { name: String((c.bowler as Record<string, unknown>).name ?? ""), overs: (c.bowler as Record<string, unknown>).overs != null ? Number((c.bowler as Record<string, unknown>).overs) : undefined }
          : undefined,
        event: c.event != null ? String(c.event) : undefined,
        runsScored: c.runsScored != null ? Number(c.runsScored) : undefined,
      })),
    };
  }
}
