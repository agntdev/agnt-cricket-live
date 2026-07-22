import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import type { CanonicalMatch } from "../providers/types.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function formatSchedule(matches: CanonicalMatch[]): string {
  if (matches.length === 0) return "No matches scheduled.";
  return matches
    .slice(0, 10)
    .map(
      (m, i) =>
        `${i + 1}. <b>${m.team1.shortName} vs ${m.team2.shortName}</b>` +
        `${m.seriesName ? `\n   ${m.seriesName}` : ""}` +
        `${m.startTime ? `\n   📅 ${m.startTime}` : ""}` +
        `${m.venue ? `\n   📍 ${m.venue}` : ""}`,
    )
    .join("\n\n");
}

async function showSchedule(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const matches = await provider.getSchedule();
  if (matches.length === 0) {
    await ctx.reply("No matches scheduled.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const text = formatSchedule(matches);
  await ctx.reply(`<b>Match schedule</b>\n\n${text}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("schedule", showSchedule);
composer.callbackQuery("schedule:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showSchedule(ctx);
});

export default composer;
