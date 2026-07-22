import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import { formatCanonicalMatchLine } from "../providers/format.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showToday(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const matches = await provider.getMatches("today");
  if (matches.length === 0) {
    await ctx.reply("No matches scheduled for today. Check back later!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const lines = matches.slice(0, 10).map((m, i) => `${i + 1}. ${formatCanonicalMatchLine(m)}`);
  await ctx.reply(`<b>Today's matches</b>\n\n${lines.join("\n\n")}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("today", showToday);
composer.callbackQuery("today:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showToday(ctx);
});

export default composer;
