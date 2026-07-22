import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "📅 Today", data: "today:show", order: 10 });
registerMainMenuItem({ label: "🔴 Live", data: "live:show", order: 20 });
registerMainMenuItem({ label: "📆 Upcoming", data: "upcoming:show", order: 30 });
registerMainMenuItem({ label: "🕐 Recent", data: "recent:show", order: 40 });
registerMainMenuItem({ label: "📊 Scorecard", data: "scorecard:show", order: 50 });
registerMainMenuItem({ label: "💬 Commentary", data: "commentary:show", order: 60 });
registerMainMenuItem({ label: "🏆 Standings", data: "points:show", order: 70 });
registerMainMenuItem({ label: "🗓 Schedule", data: "schedule:show", order: 80 });
registerMainMenuItem({ label: "👤 Player", data: "player:show", order: 90 });
registerMainMenuItem({ label: "🏏 Team", data: "team:show", order: 100 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome! Tap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
