import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    roomId: v.id("rooms"),
    isHost: v.boolean(),
    assignedCharacter: v.optional(v.string()),
    hasGuessed: v.boolean(),
    hasSurrendered: v.optional(v.boolean()),
    order: v.number(),
    revealedLetters: v.optional(v.array(v.string())),
    hangmanLetterSubmitted: v.optional(v.boolean()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_roomId_and_order", ["roomId", "order"]),

  rooms: defineTable({
    code: v.string(),
    hostId: v.optional(v.id("users")),
    status: v.union(
      v.literal("lobby"),
      v.literal("assigning"),
      v.literal("playing"),
      v.literal("finished")
    ),
    currentTurnUserId: v.optional(v.id("users")),
    activeMessageId: v.optional(v.id("messages")),
    lastActivityAt: v.number(),
    hangmanMode: v.optional(v.boolean()),
    hangmanPhaseActive: v.optional(v.boolean()),
    currentRound: v.optional(v.number()),
  }).index("by_code", ["code"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    authorId: v.id("users"),
    authorName: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("question"),
      v.literal("answer"),
      v.literal("system"),
      v.literal("guess_attempt")
    ),
    targetUserId: v.optional(v.id("users")),
    timestamp: v.number(),
  }).index("by_roomId", ["roomId"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    voterId: v.id("users"),
    vote: v.union(v.literal("yes"), v.literal("no"), v.literal("depends")),
  })
    .index("by_messageId", ["messageId"])
    .index("by_roomId_and_messageId", ["roomId", "messageId"]),
});
