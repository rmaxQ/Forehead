import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submitQuestion = mutation({
  args: {
    userId: v.id("users"),
    roomId: v.id("rooms"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const question = args.question.trim().slice(0, 300);
    if (!question) throw new Error("Pytanie nie może być puste");

    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") throw new Error("Gra nie trwa");
    if (room.currentTurnUserId !== args.userId) throw new Error("Nie Twoja tura");
    if (room.activeMessageId) throw new Error("Trwa głosowanie");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Gracz nie istnieje");

    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: args.userId,
      authorName: user.name,
      content: question,
      type: "question",
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.roomId, {
      activeMessageId: messageId,
      lastActivityAt: Date.now(),
    });

    return messageId;
  },
});

export const submitGuessAttempt = mutation({
  args: {
    userId: v.id("users"),
    roomId: v.id("rooms"),
    guessText: v.string(),
  },
  handler: async (ctx, args) => {
    const guess = args.guessText.trim().slice(0, 100);
    if (!guess) throw new Error("Odpowiedź nie może być pusta");

    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") throw new Error("Gra nie trwa");
    if (room.currentTurnUserId !== args.userId) throw new Error("Nie Twoja tura");
    if (room.activeMessageId) throw new Error("Trwa głosowanie");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Gracz nie istnieje");

    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: args.userId,
      authorName: user.name,
      content: guess,
      type: "guess_attempt",
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.roomId, {
      activeMessageId: messageId,
      lastActivityAt: Date.now(),
    });

    return messageId;
  },
});

export const getMessages = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(200);
  },
});
