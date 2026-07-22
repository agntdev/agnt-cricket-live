import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getPointsTable, formatPointsTable } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showPoints(ctx: Ctx) {
  await ctx.replyWithChatAction("typing");
  const entries = await getPointsTable();
  const text = formatPointsTable(entries);
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
