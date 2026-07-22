import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

// Menu entry point — shows followed matches with unfollow options.
// Must come BEFORE the regex handler so "unfollow:match" hits this, not the regex.
composer.callbackQuery("unfollow:match", async (ctx) => {
  await ctx.answerCallbackQuery();
  const session = ctx.session as Record<string, unknown>;
  const followed = (session.followedMatches as string[]) ?? [];

  if (followed.length === 0) {
    await ctx.reply("You're not following any matches. Nothing to unfollow.", {
      reply_markup: inlineKeyboard([
        [inlineButton("🔴 See live matches", "live:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  await ctx.reply(
    `<b>Tap a match to unfollow:</b>`,
    {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard([
        ...followed.map((id) => [inlineButton(`🔕 Unfollow #${id}`, `unfollow:${id}`)]),
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// Unfollow a specific match — removes from the user's followed list.
composer.callbackQuery(/^unfollow:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const matchId = ctx.match?.[1];
  if (!matchId) return;

  const session = ctx.session as Record<string, unknown>;
  const followed = (session.followedMatches as string[]) ?? [];
  const idx = followed.indexOf(matchId);
  if (idx === -1) {
    await ctx.reply("You weren't following that match.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  followed.splice(idx, 1);
  session.followedMatches = followed;

  await ctx.reply("Unfollowed. You won't get notifications for that match anymore.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
