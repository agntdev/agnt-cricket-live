import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import { formatCanonicalScorecard } from "../providers/format.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showScorecard(ctx: Ctx, matchId?: string) {
  if (!matchId) {
    await ctx.reply("Which match scorecard would you like? Send /scorecard followed by a match ID.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const detail = await provider.getMatchDetail(matchId);
  if (!detail) {
    await ctx.reply("Couldn't find that match. Check the match ID and try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const sc = await provider.getScorecard(matchId);
  const scorecardText = sc ? formatCanonicalScorecard(sc) : detail.status;
  const header = `${detail.team1.shortName} vs ${detail.team2.shortName}`;
  await ctx.reply(`<b>${header}</b>\n\n${scorecardText}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([
      [inlineButton("🔔 Follow this match", `follow:${matchId}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

composer.command("scorecard", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const parts = text.split(/\s+/);
  const matchId = parts.length > 1 ? parts[1] : undefined;
  await showScorecard(ctx, matchId);
});

composer.callbackQuery(/^score:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const matchId = ctx.match?.[1];
  if (matchId) await showScorecard(ctx, matchId);
});

composer.callbackQuery("scorecard:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Send /scorecard followed by a match ID to view the full scorecard.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
