import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getMatches, formatMatchLine } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showRecent(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const matches = await getMatches("recent");
  if (matches.length === 0) {
    await ctx.reply("No recent matches found. Check back later!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const lines = matches.slice(0, 10).map((m, i) => `${i + 1}. ${formatMatchLine(m)}`);
  await ctx.reply(`<b>Recently completed</b>\n\n${lines.join("\n\n")}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("recent", showRecent);
composer.callbackQuery("recent:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showRecent(ctx);
});

export default composer;
