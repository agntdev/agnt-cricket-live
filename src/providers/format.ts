// Formatting helpers for canonical types. These produce the same user-facing
// text as the cricbuzz.ts formatters but work with any provider's normalized data.

import type {
  CanonicalMatch,
  CanonicalScorecard,
  CanonicalCommentary,
  CanonicalPointsEntry,
} from "./types.js";

export function formatCanonicalMatchLine(m: CanonicalMatch): string {
  const teams = `${m.team1.shortName} vs ${m.team2.shortName}`;
  return `${teams} — ${m.status}${m.venue ? `\n📍 ${m.venue}` : ""}`;
}

export function formatCanonicalScorecard(sc: CanonicalScorecard): string {
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

export function formatCanonicalCommentary(data: CanonicalCommentary): string {
  if (!data.commentaryList || data.commentaryList.length === 0)
    return "No commentary available.";
  const recent = data.commentaryList.slice(-5);
  const lines = recent.map((c) => {
    const event = c.event ? ` [${c.event}]` : "";
    return `${c.overNum}.${c.ballNum ?? 0}: ${c.commentary}${event}`;
  });
  return lines.join("\n\n");
}

export function formatCanonicalPointsTable(entries: CanonicalPointsEntry[]): string {
  if (entries.length === 0) return "No standings available.";
  const header = "<b>Pos  Team                    M   W   L   Pts  NRR</b>";
  const rows = entries.map(
    (e) =>
      `${String(e.pos).padStart(2)}.   ${e.teamName.padEnd(22)} ${String(e.matches).padStart(2)}  ${String(e.won).padStart(2)}  ${String(e.lost).padStart(2)}  ${String(e.points).padStart(3)}  ${e.nrr ?? "-"}`,
  );
  return [header, ...rows].join("\n");
}
