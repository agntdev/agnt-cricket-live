import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import type { CanonicalTeamInfo } from "../providers/types.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function formatTeam(t: CanonicalTeamInfo): string {
  const lines = [`<b>${t.teamName}</b>`];
  if (t.squad && t.squad.length > 0) {
    lines.push(`\nSquad (${t.squad.length}):`);
    const display = t.squad.slice(0, 11);
    for (const p of display) {
      lines.push(`  • ${p.playerName}${p.playerType ? ` (${p.playerType})` : ""}`);
    }
    if (t.squad.length > 11) lines.push(`  ...and ${t.squad.length - 11} more`);
  }
  if (t.results && t.results.length > 0) {
    lines.push("\nRecent results:");
    for (const r of t.results.slice(0, 3)) {
      lines.push(`  • ${r.matchDescription}: ${r.result}`);
    }
  }
  return lines.join("\n");
}

async function showTeam(ctx: Ctx, query?: string) {
  if (!query) {
    await ctx.reply("Which team are you looking for? Send /team followed by a team name.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const teams = await provider.searchTeams(query);
  if (teams.length === 0) {
    await ctx.reply("Couldn't find that team. Try a different name.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const text = teams.slice(0, 2).map(formatTeam).join("\n\n");
  await ctx.reply(`<b>Team info</b>\n\n${text}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("team", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const parts = text.split(/\s+/);
  const query = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
  await showTeam(ctx, query);
});

composer.callbackQuery("team:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Send /team followed by a team name to get info and squad details.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
