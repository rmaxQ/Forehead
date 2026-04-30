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

    // Obsługa wyjścia w trakcie gry
    if (room.status === "playing") {
      if (room.hangmanPhaseActive) {
        const active = remaining.filter((p) => !p.hasGuessed && !p.hasSurrendered);
        const allSubmitted = active.every((p) => p.hangmanLetterSubmitted === true);
        if (allSubmitted) {
          await ctx.db.patch(args.roomId, { hangmanPhaseActive: false, lastActivityAt: Date.now() });
        }
      } else if (room.currentTurnUserId === args.userId) {
        // Gracz wychodzi podczas swojej tury — wyczyść aktywne głosowanie i przekaż turę
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
        await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
      } else {
        // Sprawdź czy gra powinna się skończyć (≤1 aktywnych graczy)
        const active = remaining.filter((p) => !p.hasGuessed && !p.hasSurrendered);
        if (active.length <= 1) {
          await ctx.db.patch(args.roomId, { status: "finished", lastActivityAt: Date.now() });
        }
      }
    } else if (room.status === "assigning") {
      // Łańcuch przypisywania jest zepsuty — resetuj do lobby
      await ctx.runMutation(internal.rooms.performResetToLobby, { roomId: args.roomId });
    }
  },
});

export const startGame = mutation({
  args: { roomId: v.id("rooms"), hostId: v.id("users"), hangmanMode: v.optional(v.boolean()) },
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
      hangmanMode: args.hangmanMode ?? false,
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

    const unguessed = players.filter((p) => !p.hasGuessed && !p.hasSurrendered);

    if (unguessed.length <= 1) {
      await ctx.db.patch(args.roomId, { status: "finished", lastActivityAt: Date.now() });
      return;
    }

    const currentOrder = room.currentTurnUserId
      ? (players.find((p) => p._id === room.currentTurnUserId)?.order ?? -1)
      : -1;

    const sortedUnguessed = unguessed.sort((a, b) => a.order - b.order);
    const nextInOrder = sortedUnguessed.find((p) => p.order > currentOrder);
    const isWrapAround = !nextInOrder;
    const nextPlayer = nextInOrder ?? sortedUnguessed[0];

    if (isWrapAround && room.hangmanMode) {
      const newRound = (room.currentRound ?? 1) + 1;
      const triggerHangman = newRound % 3 === 1 && newRound > 1;

      if (triggerHangman) {
        for (const p of unguessed) {
          await ctx.db.patch(p._id, { hangmanLetterSubmitted: false });
        }
        await ctx.db.patch(args.roomId, {
          hangmanPhaseActive: true,
          currentRound: newRound,
          currentTurnUserId: nextPlayer._id,
          activeMessageId: undefined,
          lastActivityAt: Date.now(),
        });
        return;
      }

      await ctx.db.patch(args.roomId, {
        currentTurnUserId: nextPlayer._id,
        currentRound: newRound,
        activeMessageId: undefined,
        lastActivityAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(args.roomId, {
      currentTurnUserId: nextPlayer._id,
      activeMessageId: undefined,
      lastActivityAt: Date.now(),
    });
  },
});

export const submitHangmanLetter = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms"), letter: v.string() },
  handler: async (ctx, args) => {
    const letter = args.letter.trim().toUpperCase().slice(0, 1);
    if (!letter || !/^[A-Z]$/.test(letter)) throw new Error("Nieprawidłowa litera");

    const room = await ctx.db.get(args.roomId);
    if (!room || !room.hangmanPhaseActive) throw new Error("Faza wisielca nie jest aktywna");

    const user = await ctx.db.get(args.userId);
    if (!user || user.roomId !== args.roomId) throw new Error("Gracz nie istnieje");
    if (user.hasGuessed || user.hasSurrendered) throw new Error("Nie możesz brać udziału");
    if (user.hangmanLetterSubmitted) throw new Error("Już wysłałeś/aś literę w tej fazie");

    const character = user.assignedCharacter ?? "";
    const letterIsPresent = character.toUpperCase().includes(letter);
    const currentRevealed = user.revealedLetters ?? [];
    const newRevealed =
      letterIsPresent && !currentRevealed.includes(letter)
        ? [...currentRevealed, letter]
        : currentRevealed;

    await ctx.db.patch(args.userId, {
      hangmanLetterSubmitted: true,
      revealedLetters: newRevealed,
    });

    const allPlayers = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    const activePlayers = allPlayers.filter((p) => !p.hasGuessed && !p.hasSurrendered);
    const allSubmitted = activePlayers.every(
      (p) => p._id === args.userId ? true : p.hangmanLetterSubmitted === true
    );

    if (allSubmitted) {
      await ctx.db.patch(args.roomId, {
        hangmanPhaseActive: false,
        lastActivityAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.roomId, { lastActivityAt: Date.now() });
    }
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

// Wspólna logika resetu — używana przez resetToLobby, forceResetToLobby i leaveRoom (podczas assigning)
export const performResetToLobby = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
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

    const players = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
      .collect();
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.patch(shuffled[i]._id, {
        assignedCharacter: undefined,
        hasGuessed: false,
        hasSurrendered: false,
        order: i,
        revealedLetters: undefined,
        hangmanLetterSubmitted: undefined,
      });
    }

    await ctx.db.patch(args.roomId, {
      status: "lobby",
      currentTurnUserId: undefined,
      activeMessageId: undefined,
      hangmanMode: undefined,
      hangmanPhaseActive: undefined,
      currentRound: undefined,
      lastActivityAt: Date.now(),
    });
  },
});

export const resetToLobby = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "finished") return;
    await ctx.runMutation(internal.rooms.performResetToLobby, { roomId: args.roomId });
  },
});

// Host-only reset — działa z faz "assigning" i "playing"
export const forceResetToLobby = mutation({
  args: { roomId: v.id("rooms"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Pokój nie istnieje");
    if (room.hostId !== args.userId) throw new Error("Tylko host może zresetować grę");
    if (room.status !== "assigning" && room.status !== "playing") {
      throw new Error("Można resetować tylko podczas gry");
    }
    await ctx.runMutation(internal.rooms.performResetToLobby, { roomId: args.roomId });
  },
});

// Gracz poddaje się — zostaje w wynikach jako ❌, jego tury są pomijane
export const surrenderPlayer = mutation({
  args: { userId: v.id("users"), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") throw new Error("Gra nie trwa");

    const user = await ctx.db.get(args.userId);
    if (!user || user.roomId !== args.roomId) throw new Error("Gracz nie istnieje w tym pokoju");
    if (user.hasGuessed) throw new Error("Już zgadłeś — nie możesz się poddać");
    if (user.hasSurrendered) throw new Error("Już się poddałeś");

    await ctx.db.patch(args.userId, { hasSurrendered: true });

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorId: args.userId,
      authorName: "System",
      content: `🏳️ ${user.name} poddał/a się.`,
      type: "system",
      timestamp: Date.now(),
    });

    if (room.hangmanPhaseActive) {
      const allPlayers = await ctx.db
        .query("users")
        .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
        .collect();
      const active = allPlayers.filter((p) => !p.hasGuessed && !p.hasSurrendered);
      const allSubmitted = active.every((p) => p.hangmanLetterSubmitted === true);
      if (allSubmitted) {
        await ctx.db.patch(args.roomId, { hangmanPhaseActive: false, lastActivityAt: Date.now() });
      }
      return;
    }

    if (room.currentTurnUserId === args.userId) {
      if (room.activeMessageId) {
        await ctx.db.patch(args.roomId, { activeMessageId: undefined });
      }
      await ctx.runMutation(internal.rooms.advanceTurn, { roomId: args.roomId });
    } else {
      const players = await ctx.db
        .query("users")
        .withIndex("by_roomId", (q) => q.eq("roomId", args.roomId))
        .collect();
      const active = players.filter((p) => !p.hasGuessed && !p.hasSurrendered);
      if (active.length <= 1) {
        await ctx.db.patch(args.roomId, { status: "finished", lastActivityAt: Date.now() });
      }
    }
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
