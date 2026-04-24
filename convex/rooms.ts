import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return code;
}

export const createRoom = mutation({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    const name = args.userName.trim().slice(0, 20);
    if (!name) throw new Error("Nick nie może być pusty");

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = generateCode();
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      status: "lobby",
      lastActivityAt: now,
    });

    const userId = await ctx.db.insert("users", {
      name,
      roomId,
      isHost: true,
      hasGuessed: false,
      order: 0,
    });

    await ctx.db.patch(roomId, { hostId: userId });

    return { roomCode: code, userId };
  },
});

export const joinRoom = mutation({
  args: { code: v.string(), userName: v.string() },
  handler: async (ctx, args) => {
    const name = args.userName.trim().slice(0, 20);
    if (!name) throw new Error("Nick nie może być pusty");

    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!room) throw new Error("Pokój nie istnieje");
    if (room.status !== "lobby") throw new Error("Gra już trwa");

    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", room._id))
      .collect();

    const userId = await ctx.db.insert("users", {
      name,
      roomId: room._id,
      isHost: false,
      hasGuessed: false,
      order: players.length,
    });

    await ctx.db.patch(room._id, { lastActivityAt: Date.now() });

    return { roomId: room._id, userId };
  },
});

export const leaveRoom = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.roomId !== args.roomId) return;

    await ctx.db.delete(args.userId);

    const room = await ctx.db.get(args.roomId);
    if (!room) return;

    const remaining = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(50);

    if (remaining.length === 0) {
      await ctx.db.delete(args.roomId);
      return;
    }

    if (room.hostId === args.userId) {
      const newHost = remaining[0];
      await ctx.db.patch(args.roomId, { hostId: newHost._id });
      await ctx.db.patch(newHost._id, { isHost: true });
    }
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms"), hostId: v.id("users") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Pokój nie istnieje");
    if (room.hostId !== args.hostId) throw new Error("Tylko host może zacząć grę");
    if (room.status !== "lobby") throw new Error("Gra już trwa");

    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();

    if (players.length < 3) throw new Error("Potrzeba co najmniej 3 graczy");

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.patch(shuffled[i]._id, { order: i });
    }

    await ctx.db.patch(args.roomId, {
      status: "assigning",
      lastActivityAt: Date.now(),
    });
  },
});

export const advanceTurn = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") return;

    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId_and_order", (q) => q.eq("roomId", args.roomId))
      .collect();

    const unguessed = players.filter((p) => !p.hasGuessed);

    if (unguessed.length <= 1) {
      await ctx.db.patch(args.roomId, { status: "finished", lastActivityAt: Date.now() });
      return;
    }

    const currentOrder = room.currentTurnUserId
      ? (players.find((p) => p._id === room.currentTurnUserId)?.order ?? -1)
      : -1;

    const sortedUnguessed = unguessed.sort((a, b) => a.order - b.order);
    const nextPlayer =
      sortedUnguessed.find((p) => p.order > currentOrder) ?? sortedUnguessed[0];

    await ctx.db.patch(args.roomId, {
      currentTurnUserId: nextPlayer._id,
      activeMessageId: undefined,
      lastActivityAt: Date.now(),
    });
  },
});

export const markPlayerWon = internalMutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    await ctx.db.patch(args.userId, { hasGuessed: true });

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: args.userId,
      authorName: "System",
      content: `🎉 ${user.name} zgadł/a swoją postać: **${user.assignedCharacter}**!`,
      type: "system",
      timestamp: Date.now(),
    });

    await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
  },
});

export const endGame = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(100);

    for (const msg of msgs) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
        .take(100);
      for (const vote of votes) await ctx.db.delete(vote._id);
      await ctx.db.delete(msg._id);
    }

    if (msgs.length === 100) {
      await ctx.scheduler.runAfter(0, internal.rooms.endGame, { roomId: args.roomId });
      return;
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .take(100);

    for (const user of users) await ctx.db.delete(user._id);

    const room = await ctx.db.get(args.roomId);
    if (room) await ctx.db.delete(args.roomId);
  },
});

export const cleanupFinishedRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "finished") return;
    await ctx.runMutation(internal.rooms.endGame, { roomId: args.roomId });
  },
});

export const resetToLobby = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "finished") return;

    // Delete all messages and their votes
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const msg of messages) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
        .collect();
      for (const vote of votes) await ctx.db.delete(vote._id);
      await ctx.db.delete(msg._id);
    }

    // Reset players and re-shuffle order
    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.patch(shuffled[i]._id, {
        assignedCharacter: undefined,
        hasGuessed: false,
        order: i,
      });
    }

    await ctx.db.patch(args.roomId, {
      status: "lobby",
      currentTurnUserId: undefined,
      activeMessageId: undefined,
      lastActivityAt: Date.now(),
    });
  },
});

export const cleanupInactiveRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const rooms = await ctx.db.query("rooms").take(50);
    for (const room of rooms) {
      if (room.lastActivityAt < cutoff) {
        await ctx.runMutation(internal.rooms.endGame, { roomId: room._id });
      }
    }
  },
});

export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
  },
});
