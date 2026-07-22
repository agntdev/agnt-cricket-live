import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getSchedule, type ScheduleMatch } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function formatSchedule(matches: ScheduleMatch[]): string {
  if (matches.length === 0) return "No matches scheduled.";
  return matches
    .slice(0, 10)
    .map(
      (m, i) =>
        `${i + 1}. <b>${m.team1.shortName} vs ${m.team2.shortName}</b>` +
        `${m.seriesName ? `\n   ${m.seriesName}` : ""}` +
        `${m.startDate ? `\n   📅 ${m.startDate}` : ""}` +
        `${m.venue ? `\n   📍 ${m.venue}` : ""}`,
    )
    .join("\n\n");
}

async function showSchedule(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const matches = await getSchedule();
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
