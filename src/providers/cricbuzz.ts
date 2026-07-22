// Cricbuzz provider adapter — wraps the existing cricbuzz.ts API client
// and normalizes responses into the canonical model.

import {
  getMatches,
  getMatchDetail,
  getScorecard,
  getCommentary,
  getPointsTable,
  getSchedule,
  searchPlayer,
  searchTeams,
  getTeamInfo,
  type CricbuzzMatch,
  type MatchDetail,
  type ScorecardData,
  type CommentaryData,
  type PointsEntry,
  type ScheduleMatch,
  type PlayerProfile,
  type TeamInfo,
} from "../cricbuzz.js";
import type {
  LiveUpdateProvider,
  CanonicalMatch,
  CanonicalMatchDetail,
  CanonicalScorecard,
  CanonicalCommentary,
  CanonicalPointsEntry,
  CanonicalPlayerProfile,
  CanonicalTeamInfo,
} from "./types.js";

function normalizeMatchStatus(status: string): "live" | "upcoming" | "recent" | "today" {
  const s = status.toLowerCase();
  if (s === "in progress" || s === "live") return "live";
  if (s === "complete" || s === "finished") return "recent";
  if (s === "upcoming" || s === "not started") return "upcoming";
  return "today";
}

function normalizeMatch(m: CricbuzzMatch): CanonicalMatch {
  return {
    matchId: m.matchId,
    description: m.matchDescription,
    team1: { id: m.team1.id, name: m.team1.name, shortName: m.team1.shortName },
    team2: { id: m.team2.id, name: m.team2.name, shortName: m.team2.shortName },
    status: m.status || m.matchStatus,
    matchStatus: normalizeMatchStatus(m.status || m.matchStatus),
    venue: m.venue,
    tossWinner: m.tossWinner,
    tossDecision: m.tossDecision,
    startTime: m.startTime,
    matchType: m.matchType,
    seriesName: m.seriesName,
  };
}

function normalizeMatchDetail(d: MatchDetail): CanonicalMatchDetail {
  const base = normalizeMatch(d);
  return {
    ...base,
    innings: d.innings?.map((inn) => ({
      inningsId: inn.inningsId,
      teamId: inn.teamId,
      teamName: inn.teamName,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      balls: inn.balls,
      runRate: inn.runRate,
      requiredRunRate: inn.requiredRunRate,
    })),
    umpires: d.umpires,
    referee: d.referee,
    result: d.result,
  };
}

function normalizeScheduleMatch(m: ScheduleMatch): CanonicalMatch {
  return {
    matchId: m.matchId,
    description: m.matchDescription,
    team1: { id: "", name: m.team1.name, shortName: m.team1.shortName },
    team2: { id: "", name: m.team2.name, shortName: m.team2.shortName },
    status: m.matchStatus,
    matchStatus: normalizeMatchStatus(m.matchStatus),
    venue: m.venue ?? "",
    startTime: m.startDate,
    seriesName: m.seriesName,
  };
}

export class CricbuzzAdapter implements LiveUpdateProvider {
  readonly name = "cricbuzz" as const;

  async getMatches(status: "live" | "recent" | "upcoming" | "today"): Promise<CanonicalMatch[]> {
    const matches = await getMatches(status);
    return matches.map(normalizeMatch);
  }

  async getMatchDetail(matchId: string): Promise<CanonicalMatchDetail | null> {
    const detail = await getMatchDetail(matchId);
    if (!detail) return null;
    return normalizeMatchDetail(detail);
  }

  async getScorecard(matchId: string): Promise<CanonicalScorecard | null> {
    const sc = await getScorecard(matchId);
    if (!sc) return null;
    return {
      matchId: sc.matchId,
      scorecard: sc.scorecard?.map((inn) => ({
        inningsId: inn.inningsId,
        teamId: inn.teamId,
        teamName: inn.teamName,
        runs: inn.runs,
        wickets: inn.wickets,
        overs: inn.overs,
        extras: inn.extras,
        batsmen: inn.batsmen?.map((b) => ({
          batterId: b.batterId,
          batterName: b.batterName,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          strikeRate: b.strikeRate,
          dismissal: b.dismissal,
          bowler: b.bowler,
        })),
        bowlers: inn.bowlers?.map((b) => ({
          bowlerId: b.bowlerId,
          bowlerName: b.bowlerName,
          overs: b.overs,
          maidens: b.maidens,
          runs: b.runs,
          wickets: b.wickets,
          economy: b.economy,
          extras: b.extras,
        })),
        fallOfWickets: inn.fallOfWickets,
      })),
    };
  }

  async getCommentary(matchId: string): Promise<CanonicalCommentary | null> {
    const data = await getCommentary(matchId);
    if (!data) return null;
    return {
      matchId: data.matchId,
      commentaryList: data.commentaryList?.map((c) => ({
        overNum: c.overNum,
        ballNum: c.ballNum,
        commentary: c.commentary,
        batsman: c.batsman,
        bowler: c.bowler,
        event: c.event,
        runsScored: c.runsScored,
      })),
    };
  }

  async getPointsTable(seriesId?: string): Promise<CanonicalPointsEntry[]> {
    const entries = await getPointsTable(seriesId);
    return entries.map((e) => ({
      teamId: e.teamId,
      teamName: e.teamName,
      matches: e.matches,
      won: e.won,
      lost: e.lost,
      tied: e.tied,
      nrr: e.nrr,
      points: e.points,
      pos: e.pos,
    }));
  }

  async getSchedule(date?: string, seriesId?: string): Promise<CanonicalMatch[]> {
    const matches = await getSchedule(date, seriesId);
    return matches.map(normalizeScheduleMatch);
  }

  async searchPlayer(name: string): Promise<CanonicalPlayerProfile[]> {
    const players = await searchPlayer(name);
    return players.map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      country: p.country,
      battingStyle: p.battingStyle,
      bowlingStyle: p.bowlingStyle,
      playerType: p.playerType,
    }));
  }

  async searchTeams(name: string): Promise<CanonicalTeamInfo[]> {
    const teams = await searchTeams(name);
    return teams.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      squad: t.squad,
      results: t.results,
    }));
  }

  async getTeamInfo(teamId: string): Promise<CanonicalTeamInfo | null> {
    const info = await getTeamInfo(teamId);
    if (!info) return null;
    return {
      teamId: info.teamId,
      teamName: info.teamName,
      squad: info.squad,
      results: info.results,
    };
  }
}
