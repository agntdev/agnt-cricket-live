import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import { formatCanonicalPointsTable } from "../providers/format.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showPoints(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const entries = await provider.getPointsTable();
  const text = formatCanonicalPointsTable(entries);
  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("points", showPoints);
composer.callbackQuery("points:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPoints(ctx);
});

export default composer;
