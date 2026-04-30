import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const getPlayers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_roomId_and_order", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const assignCharacter = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    character: v.string(),
  },
  handler: async (ctx, args) => {
    const character = args.character.trim().slice(0, 100);
    if (!character) throw new Error("Postać nie może być pusta");

    const toUser = await ctx.db.get(args.toUserId);
    if (!toUser) throw new Error("Gracz nie istnieje");
    if (toUser.assignedCharacter !== undefined) throw new Error("Ta osoba ma już przypisaną postać");

    await ctx.db.patch(args.toUserId, { assignedCharacter: character });

    const fromUser = await ctx.db.get(args.fromUserId);
    if (!fromUser) return;

    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", fromUser.roomId))
      .collect();

    const allAssigned = players.every((p) => p.assignedCharacter !== undefined);

    if (allAssigned) {
      const sorted = players.sort((a, b) => a.order - b.order);
      const room = await ctx.db.get(fromUser.roomId);
      await ctx.db.patch(fromUser.roomId, {
        status: "playing",
        currentTurnUserId: sorted[0]._id,
        currentRound: room?.hangmanMode ? 1 : undefined,
        lastActivityAt: Date.now(),
      });

      await ctx.db.insert("messages", {
        roomId: fromUser.roomId,
        authorId: args.fromUserId,
        authorName: "System",
        content: "🎭 Wszyscy mają przypisane postacie! Gra się zaczyna!",
        type: "system",
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.patch(fromUser.roomId, { lastActivityAt: Date.now() });
    }
  },
});

export const getMyCharacter = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    // Never return own character — this query is only for revealing others' characters after game ends
    return null;
  },
});

export const getPlayersWithCharacters = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_roomId_and_order", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});
