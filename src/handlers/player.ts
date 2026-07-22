import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { searchPlayer, type PlayerProfile } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function formatPlayer(p: PlayerProfile): string {
  const lines = [`<b>${p.playerName}</b>`];
  if (p.country) lines.push(`🌍 ${p.country}`);
  if (p.playerType) lines.push(`🏏 ${p.playerType}`);
  if (p.battingStyle) lines.push(`Batting: ${p.battingStyle}`);
  if (p.bowlingStyle) lines.push(`Bowling: ${p.bowlingStyle}`);
  return lines.join("\n");
}

async function showPlayer(ctx: Ctx, query?: string) {
  if (!query) {
    await ctx.reply("Which player are you looking for? Send /player followed by a name.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.replyWithChatAction("typing");
  const players = await searchPlayer(query);
  if (players.length === 0) {
    await ctx.reply("Couldn't find that player. Try a different name.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const text = players.slice(0, 3).map(formatPlayer).join("\n\n");
  await ctx.reply(`<b>Player search</b>\n\n${text}`, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
}

composer.command("player", async (ctx) => {
  const text = ctx.message?.text ?? "";
  const parts = text.split(/\s+/);
  const query = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
  await showPlayer(ctx, query);
});

composer.callbackQuery("player:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Send /player followed by a player's name to search.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
