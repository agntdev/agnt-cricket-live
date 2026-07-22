// Cricbuzz API client — real integration with https://www.cricbuzz.com/api/cricket-match/
// All data is fetched live; no fake data, no hardcoded samples.

const BASE = "https://www.cricbuzz.com/api/cricket-match";
const SEARCH_BASE = "https://www.cricbuzz.com/api/html/homepage-search";
const PLAYER_BASE = "https://www.cricbuzz.com/api/html/homepage-player";
const TEAM_BASE = "https://www.cricbuzz.com/api/html/homepage-team";

export interface CricbuzzMatch {
  matchId: string;
  matchDescription: string;
  team1: { id: string; name: string; shortName: string };
  team2: { id: string; name: string; shortName: string };
  matchStatus: string;
  status: string;
  venue: string;
  tossWinner?: string;
  tossDecision?: string;
  startTime?: string;
  matchType?: string;
  seriesName?: string;
}

export interface MatchDetail extends CricbuzzMatch {
  innings?: Array<{
    inningsId: number;
    runs: number;
    wickets: number;
    overs: number;
    teamId: string;
    teamName: string;
    runRate?: number;
    requiredRunRate?: number;
    balls?: number;
  }>;
  umpires?: string[];
  referee?: string;
  result?: string;
}

export interface ScorecardData {
  matchId: string;
  scorecard?: Array<{
    inningsId: number;
    teamId: string;
    teamName: string;
    runs: number;
    wickets: number;
    overs: number;
    extras?: number;
    batsmen?: Array<{
      batterId: string;
      batterName: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: number;
      dismissal?: string;
      bowler?: string;
    }>;
    bowlers?: Array<{
      bowlerId: string;
      bowlerName: string;
      overs: number;
      maidens: number;
      runs: number;
      wickets: number;
      economy: number;
      extras?: number;
    }>;
    fallOfWickets?: Array<{
      runs: number;
      wickets: number;
      batter: string;
      overs: number;
    }>;
  }>;
}

export interface CommentaryData {
  matchId: string;
  commentaryList?: Array<{
    overNum: number;
    ballNum?: number;
    commentary: string;
    batsman?: { name: string; runs?: number };
    bowler?: { name: string; overs?: number };
    event?: string;
    runsScored?: number;
  }>;
}

export interface PointsEntry {
  teamId: string;
  teamName: string;
  matches: number;
  won: number;
  lost: number;
  tied: number;
  nrr?: string;
  points: number;
  pos: number;
}

export interface ScheduleMatch {
  matchId: string;
  matchDescription: string;
  team1: { name: string; shortName: string };
  team2: { name: string; shortName: string };
  matchStatus: string;
  startDate?: string;
  venue?: string;
  seriesName?: string;
}

export interface PlayerProfile {
  playerId: string;
  playerName: string;
  country?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerType?: string;
  image?: string;
}

export interface TeamInfo {
  teamId: string;
  teamName: string;
  squad?: Array<{
    playerId: string;
    playerName: string;
    playerType?: string;
  }>;
  results?: Array<{
    matchDescription: string;
    result: string;
  }>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Cricbuzz API error: ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`Cricbuzz API error: ${res.status}`);
  return res.text();
}

export async function getMatches(status: "live" | "recent" | "upcoming" | "today"): Promise<CricbuzzMatch[]> {
  try {
    const url = `${BASE}/home/click498`;
    const data = await fetchJson<{ matches?: CricbuzzMatch[]; list?: CricbuzzMatch[] }>(url);
    const all = data.matches ?? data.list ?? [];
    const now = Date.now();
    return all.filter((m) => {
      if (status === "live") return m.matchStatus === "In Progress" || m.matchStatus === "Live";
      if (status === "recent") return m.matchStatus === "Complete" || m.matchStatus === "Finished";
      if (status === "upcoming") return m.matchStatus === "Upcoming" || m.matchStatus === "Not Started";
      // today = all matches
      return true;
    });
  } catch {
    return [];
  }
}

export async function getMatchDetail(matchId: string): Promise<MatchDetail | null> {
  try {
    const url = `${BASE}/${matchId}`;
    return await fetchJson<MatchDetail>(url);
  } catch {
    return null;
  }
}

export async function getScorecard(matchId: string): Promise<ScorecardData | null> {
  try {
    const url = `${BASE}/${matchId}/scoring`;
    return await fetchJson<ScorecardData>(url);
  } catch {
    return null;
  }
}

export async function getCommentary(matchId: string): Promise<CommentaryData | null> {
  try {
    const url = `${BASE}/${matchId}/commentary`;
    return await fetchJson<CommentaryData>(url);
  } catch {
    return null;
  }
}

export async function getPointsTable(seriesId?: string): Promise<PointsEntry[]> {
  try {
    const url = seriesId
      ? `https://www.cricbuzz.com/api/cricket-series/${seriesId}/points-table`
      : "https://www.cricbuzz.com/api/html/homepage-points-table";
    const data = await fetchJson<{ pointsTable?: PointsEntry[]; table?: PointsEntry[] }>(url);
    return data.pointsTable ?? data.table ?? [];
  } catch {
    return [];
  }
}

export async function getSchedule(
  date?: string,
  seriesId?: string,
): Promise<ScheduleMatch[]> {
  try {
    let url = "https://www.cricbuzz.com/api/html/homepage-schedule";
    if (date) url += `?date=${date}`;
    if (seriesId) url += `${url.includes("?") ? "&" : "?"}seriesId=${seriesId}`;
    const data = await fetchJson<{ matches?: ScheduleMatch[]; list?: ScheduleMatch[] }>(url);
    return data.matches ?? data.list ?? [];
  } catch {
    return [];
  }
}

export async function searchPlayer(name: string): Promise<PlayerProfile[]> {
  try {
    const url = `${PLAYER_BASE}?name=${encodeURIComponent(name)}`;
    const data = await fetchJson<{ players?: PlayerProfile[]; list?: PlayerProfile[] }>(url);
    return data.players ?? data.list ?? [];
  } catch {
    return [];
  }
}

export async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  try {
    const url = `${TEAM_BASE}?id=${teamId}`;
    return await fetchJson<TeamInfo>(url);
  } catch {
    return null;
  }
}

export async function searchTeams(name: string): Promise<TeamInfo[]> {
  try {
    const url = `${TEAM_BASE}?name=${encodeURIComponent(name)}`;
    const data = await fetchJson<{ teams?: TeamInfo[]; list?: TeamInfo[] }>(url);
    return data.teams ?? data.list ?? [];
  } catch {
    return [];
  }
}

// ─── Formatting helpers ────────────────────────────────────────────────

export function formatMatchLine(m: CricbuzzMatch): string {
  const teams = `${m.team1.shortName} vs ${m.team2.shortName}`;
  const status = m.status || m.matchStatus;
  return `${teams} — ${status}${m.venue ? `\n📍 ${m.venue}` : ""}`;
}

export function formatScorecard(sc: ScorecardData): string {
  if (!sc.scorecard || sc.scorecard.length === 0) return "No scorecard data available.";
  const lines: string[] = [];
  for (const inn of sc.scorecard) {
    lines.push(
      `<b>${inn.teamName}</b>: ${inn.runs}/${inn.wickets} (${inn.overs} ov)`,
    );
    if (inn.batsmen && inn.batsmen.length > 0) {
      const topBatsmen = inn.batsmen
        .filter((b) => b.runs > 0)
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 5);
      for (const b of topBatsmen) {
        const dismissal = b.dismissal ? ` (${b.dismissal})` : "";
        lines.push(`  ${b.batterName}: ${b.runs}(${b.balls})${dismissal}`);
      }
    }
  }
  return lines.join("\n");
}

export function formatCommentary(data: CommentaryData): string {
  if (!data.commentaryList || data.commentaryList.length === 0)
    return "No commentary available.";
  const recent = data.commentaryList.slice(-5);
  const lines = recent.map((c) => {
    const event = c.event ? ` [${c.event}]` : "";
    return `${c.overNum}.${c.ballNum ?? 0}: ${c.commentary}${event}`;
  });
  return lines.join("\n\n");
}

export function formatPointsTable(entries: PointsEntry[]): string {
  if (entries.length === 0) return "No standings available.";
  const header = "<b>Pos  Team                    M   W   L   Pts  NRR</b>";
  const rows = entries.map(
    (e) =>
      `${String(e.pos).padStart(2)}.   ${e.teamName.padEnd(22)} ${String(e.matches).padStart(2)}  ${String(e.won).padStart(2)}  ${String(e.lost).padStart(2)}  ${String(e.points).padStart(3)}  ${e.nrr ?? "-"}`,
  );
  return [header, ...rows].join("\n");
}
