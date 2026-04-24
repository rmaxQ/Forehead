import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const submitVote = mutation({
  args: {
    voterId: v.id("users"),
    roomId: v.id("rooms"),
    vote: v.union(v.literal("yes"), v.literal("no"), v.literal("depends")),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.activeMessageId) throw new Error("Brak aktywnego głosowania");
    if (room.currentTurnUserId === args.voterId) throw new Error("Nie możesz głosować na siebie");

    const messageId = room.activeMessageId;

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .filter((q) => q.eq(q.field("voterId"), args.voterId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { vote: args.vote });
    } else {
      await ctx.db.insert("votes", {
        roomId: args.roomId,
        messageId,
        voterId: args.voterId,
        vote: args.vote,
      });
    }

    const allPlayers = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    // Wszyscy gracze poza aktywnym mogą głosować (w tym ci, którzy już zgadli)
    const voters = allPlayers.filter((p) => p._id !== room.currentTurnUserId);
    const totalVoters = voters.length;

    const allVotes = await ctx.db
      .query("votes")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    const yesCount = allVotes.filter((v) => v.vote === "yes").length;
    const noCount = allVotes.filter((v) => v.vote === "no").length;
    const dependsCount = allVotes.filter((v) => v.vote === "depends").length;
    const majority = Math.floor(totalVoters / 2) + 1;

    const message = await ctx.db.get(messageId);
    if (!message) return;

    if (message.type === "guess_attempt") {
      if (yesCount >= majority) {
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.markPlayerWon, {
          userId: room.currentTurnUserId!,
          roomId: args.roomId,
        });
      } else if (noCount >= majority || allVotes.length >= totalVoters) {
        await ctx.db.insert("messages", {
          roomId: args.roomId,
          authorId: room.currentTurnUserId!,
          authorName: "System",
          content: `❌ Niestety, to nie jest poprawna odpowiedź. Tura przechodzi dalej.`,
          type: "system",
          timestamp: Date.now(),
        });
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
      }
    } else if (message.type === "question") {
      if (yesCount >= majority) {
        await ctx.db.insert("messages", {
          roomId: args.roomId,
          authorId: room.currentTurnUserId!,
          authorName: "System",
          content: `✅ TAK`,
          type: "answer",
          timestamp: Date.now(),
        });
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
      } else if (noCount >= majority) {
        await ctx.db.insert("messages", {
          roomId: args.roomId,
          authorId: room.currentTurnUserId!,
          authorName: "System",
          content: `❌ NIE`,
          type: "answer",
          timestamp: Date.now(),
        });
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
      } else if (allVotes.length >= totalVoters) {
        // Wszyscy zagłosowali, brak większości — wygrywa najliczniejsza opcja
        let answer: string;
        if (dependsCount > yesCount && dependsCount > noCount) {
          answer = `🤷 ZALEŻY`;
        } else if (yesCount > noCount) {
          answer = `✅ TAK`;
        } else {
          answer = `❌ NIE`;
        }
        await ctx.db.insert("messages", {
          roomId: args.roomId,
          authorId: room.currentTurnUserId!,
          authorName: "System",
          content: answer,
          type: "answer",
          timestamp: Date.now(),
        });
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
      }
    }
  },
});

export const getVotes = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});
