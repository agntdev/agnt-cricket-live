import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getMatchDetail } from "../cricbuzz.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

// Menu entry point — list followed matches or prompt to follow one.
// Must come BEFORE the regex handler so "follow:match" hits this, not the regex.
composer.callbackQuery("follow:match", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session as Record<string, unknown>;
  const followed = (session.followedMatches as string[]) ?? [];

  if (followed.length === 0) {
    await ctx.reply(
      "You're not following any matches yet. Open a live match and tap Follow to get started.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🔴 See live matches", "live:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }

  const lines = followed.map((id) => `• Match #${id}`);
  await ctx.reply(
    `<b>Following ${followed.length} match${followed.length > 1 ? "es" : ""}</b>\n\n${lines.join("\n")}`,
    {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard([
        ...followed.map((id) => [inlineButton(`🔕 Unfollow #${id}`, `unfollow:${id}`)]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// Follow a specific match — stores in the user's session for notification tracking.
composer.callbackQuery(/^follow:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const matchId = ctx.match?.[1];
  if (!matchId) return;

  const userId = String(ctx.from?.id ?? "");
  if (!userId) return;

  const session = ctx.session as Record<string, unknown>;
  const followed = (session.followedMatches as string[]) ?? [];
  if (followed.includes(matchId)) {
    await ctx.reply("You're already following this match.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  followed.push(matchId);
  session.followedMatches = followed;

  const detail = await getMatchDetail(matchId);
  const matchName = detail
    ? `${detail.team1.shortName} vs ${detail.team2.shortName}`
    : `Match #${matchId}`;

  await ctx.reply(
    `<b>Following:</b> ${matchName}\n\nYou'll get notified when something big happens — wickets, boundaries, and over endings.`,
    {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard([
        [inlineButton("🔕 Unfollow", `unfollow:${matchId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
