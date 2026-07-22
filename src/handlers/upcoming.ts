import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getMatches, formatMatchLine } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showUpcoming(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const matches = await getMatches("upcoming");
  if (matches.length === 0) {
    await ctx.reply("No upcoming matches scheduled. Check back later!", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const lines = matches.slice(0, 10).map((m, i) => `${i + 1}. ${formatMatchLine(m)}`);
  await ctx.reply(`<b>Upcoming matches</b>\n\n${lines.join("\n\n")}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("upcoming", showUpcoming);
composer.callbackQuery("upcoming:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showUpcoming(ctx);
});

export default composer;
