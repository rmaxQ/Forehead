"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  players: Doc<"users">[];
  userId: Id<"users">;
  currentTurnUserId?: Id<"users">;
}

export default function PlayersSidebar({ players, userId, currentTurnUserId }: Props) {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {players.map((player) => {
        const isCurrent = player._id === currentTurnUserId;
        const isMe = player._id === userId;
        const isSurrendered = player.hasSurrendered === true;
        const character = !isMe ? player.assignedCharacter : undefined;

        return (
          <div
            key={player._id}
            className={cn(
              "flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl transition-all cursor-default",
              isCurrent && !player.hasGuessed && !isSurrendered
                ? "bg-cyan-500/20 border border-cyan-500/40"
                : player.hasGuessed
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : isSurrendered
                ? "bg-white/5 border border-white/10 opacity-50"
                : "bg-white/5 border border-white/10"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                isCurrent && !player.hasGuessed && !isSurrendered
                  ? "bg-cyan-500 text-black"
                  : player.hasGuessed
                  ? "bg-emerald-500/30 text-emerald-300"
                  : "bg-white/10 text-white/60"
              )}
            >
              {player.hasGuessed ? "✅" : isSurrendered ? "🏳️" : player.name[0].toUpperCase()}
            </div>

            {/* Player name */}
            <span
              className={cn(
                "text-xs truncate w-full text-center leading-tight",
                isCurrent && !player.hasGuessed && !isSurrendered
                  ? "text-cyan-300 font-semibold"
                  : player.hasGuessed
                  ? "text-emerald-300"
                  : "text-white/50"
              )}
              title={player.name}
            >
              {player.name}
              {isMe && " (ty)"}
            </span>

            {/* Character name — always visible, wraps if long; title shows full on hover */}
            {character && (
              <span
                className="text-xs text-cyan-200/60 w-full text-center leading-tight break-words"
                title={character}
              >
                {character}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
