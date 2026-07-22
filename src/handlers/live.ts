import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import { formatCanonicalMatchLine } from "../providers/format.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showLive(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const matches = await provider.getMatches("live");
  if (matches.length === 0) {
    await ctx.reply("No live matches right now. Check back soon!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const lines = matches.slice(0, 10).map((m, i) => {
    return `${i + 1}. ${formatCanonicalMatchLine(m)}`;
  });
  const kb = matches.slice(0, 10).flatMap((m) => [
    [inlineButton(`${m.team1.shortName} vs ${m.team2.shortName}`, `score:${m.matchId}`)],
  ]);
  kb.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply(`<b>Live matches</b>\n\n${lines.join("\n\n")}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard(kb),
  });
}

composer.command("live", showLive);
composer.callbackQuery("live:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showLive(ctx);
});

export default composer;
