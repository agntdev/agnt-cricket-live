// Canonical cricket data model and provider adapter interface.
// All providers normalize their responses into these types so handlers
// are provider-agnostic.

export type ProviderName = "cricbuzz" | "cricapi" | "sportradar" | "cricketdata" | "custom";

export interface CanonicalMatch {
  matchId: string;
  description: string;
  team1: { id: string; name: string; shortName: string };
  team2: { id: string; name: string; shortName: string };
  status: string;
  matchStatus: "live" | "upcoming" | "recent" | "today";
  venue: string;
  tossWinner?: string;
  tossDecision?: string;
  startTime?: string;
  matchType?: string;
  seriesName?: string;
  umpires?: string[];
  referee?: string;
  result?: string;
}

export interface CanonicalInning {
  inningsId: number;
  teamId: string;
  teamName: string;
  runs: number;
  wickets: number;
  overs: number;
  balls?: number;
  runRate?: number;
  requiredRunRate?: number;
}

export interface CanonicalMatchDetail extends CanonicalMatch {
  innings?: CanonicalInning[];
}

export interface CanonicalBatsman {
  batterId: string;
  batterName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal?: string;
  bowler?: string;
}

export interface CanonicalBowler {
  bowlerId: string;
  bowlerName: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  extras?: number;
}

export interface CanonicalFallOfWicket {
  runs: number;
  wickets: number;
  batter: string;
  overs: number;
}

export interface CanonicalScorecardInning {
  inningsId: number;
  teamId: string;
  teamName: string;
  runs: number;
  wickets: number;
  overs: number;
  extras?: number;
  batsmen?: CanonicalBatsman[];
  bowlers?: CanonicalBowler[];
  fallOfWickets?: CanonicalFallOfWicket[];
}

export interface CanonicalScorecard {
  matchId: string;
  scorecard?: CanonicalScorecardInning[];
}

export interface CanonicalBallEvent {
  overNum: number;
  ballNum?: number;
  commentary: string;
  batsman?: { name: string; runs?: number };
  bowler?: { name: string; overs?: number };
  event?: string;
  runsScored?: number;
}

export interface CanonicalCommentary {
  matchId: string;
  commentaryList?: CanonicalBallEvent[];
}

export interface CanonicalPointsEntry {
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

export interface CanonicalPlayerProfile {
  playerId: string;
  playerName: string;
  country?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerType?: string;
}

export interface CanonicalTeamInfo {
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

/**
 * The provider adapter interface. Each provider implements these methods
 * to fetch and normalize data into the canonical model.
 */
export interface LiveUpdateProvider {
  readonly name: ProviderName;

  getMatches(status: "live" | "recent" | "upcoming" | "today"): Promise<CanonicalMatch[]>;
  getMatchDetail(matchId: string): Promise<CanonicalMatchDetail | null>;
  getScorecard(matchId: string): Promise<CanonicalScorecard | null>;
  getCommentary(matchId: string): Promise<CanonicalCommentary | null>;
  getPointsTable(seriesId?: string): Promise<CanonicalPointsEntry[]>;
  getSchedule(date?: string, seriesId?: string): Promise<CanonicalMatch[]>;
  searchPlayer(name: string): Promise<CanonicalPlayerProfile[]>;
  searchTeams(name: string): Promise<CanonicalTeamInfo[]>;
  getTeamInfo(teamId: string): Promise<CanonicalTeamInfo | null>;
}
