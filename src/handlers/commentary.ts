import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getProvider } from "../providers/index.js";
import { formatCanonicalCommentary } from "../providers/format.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

async function showCommentary(ctx: Ctx, matchId?: string) {
  if (!matchId) {
    await ctx.reply("Which match commentary would you like? Send /commentary followed by a match ID.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.replyWithChatAction("typing");
  const provider = getProvider();
  const data = await provider.getCommentary(matchId);
  if (!data) {
    await ctx.reply("Couldn't load commentary for that match. Try again later.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const text = formatCanonicalCommentary(data);
  await ctx.reply(`<b>Ball-by-ball commentary</b>\n\n${text}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", `commentary:${matchId}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

composer.command("commentary", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const parts = text.split(/\s+/);
  const matchId = parts.length > 1 ? parts[1] : undefined;
  await showCommentary(ctx, matchId);
});

composer.callbackQuery(/^commentary:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const matchId = ctx.match?.[1];
  if (matchId) await showCommentary(ctx, matchId);
});

composer.callbackQuery("commentary:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Send /commentary followed by a match ID to view ball-by-ball commentary.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
