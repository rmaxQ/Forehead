"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import ChatHistory from "./ChatHistory";
import TurnActions from "./TurnActions";
import VotingPanel from "./VotingPanel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
}

export default function PlayingPhase({ room, userId }: Props) {
  const players = useQuery(api.users.getPlayers, { roomId: room._id });
  const messages = useQuery(api.messages.getMessages, { roomId: room._id });

  if (!players || !messages) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Ładowanie...</div>
      </div>
    );
  }

  const isMyTurn = room.currentTurnUserId === userId;
  const currentPlayer = players.find((p) => p._id === room.currentTurnUserId);
  const me = players.find((p) => p._id === userId);

  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h1 className="text-xl font-black text-fuchsia-400">Czułko 🎭</h1>
        <span className="text-white/40 text-sm font-mono tracking-widest">{room.code}</span>
      </div>

      {/* Players strip */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b border-white/10 shrink-0">
        {players.map((player) => {
          const isCurrent = player._id === room.currentTurnUserId;
          const isMe = player._id === userId;
          return (
            <div
              key={player._id}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl shrink-0 transition-all",
                isCurrent && !player.hasGuessed
                  ? "bg-fuchsia-500/20 border border-fuchsia-500/40 animate-pulse-glow"
                  : player.hasGuessed
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-white/5 border border-white/10"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                  isCurrent && !player.hasGuessed
                    ? "bg-fuchsia-500 text-white"
                    : player.hasGuessed
                    ? "bg-emerald-500/30 text-emerald-300"
                    : "bg-white/10 text-white/60"
                )}
              >
                {player.hasGuessed ? "✅" : player.name[0].toUpperCase()}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isCurrent && !player.hasGuessed
                    ? "text-fuchsia-300 font-semibold"
                    : player.hasGuessed
                    ? "text-emerald-300"
                    : "text-white/50"
                )}
              >
                {player.name}
                {isMe && " (ty)"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current turn indicator */}
      {currentPlayer && !currentPlayer.hasGuessed && (
        <div className="px-4 py-2 bg-fuchsia-900/20 border-b border-fuchsia-500/20">
          <p className="text-fuchsia-300 text-sm text-center">
            {isMyTurn ? "🎯 Twoja tura!" : `🎲 Tura: ${currentPlayer.name}`}
          </p>
        </div>
      )}

      {/* My character hint */}
      {me && !me.hasGuessed && (
        <div className="px-4 py-2 bg-amber-400/5 border-b border-amber-400/10">
          <p className="text-amber-300/60 text-xs text-center">
            👤 Twoja postać jest ukryta — zgadnij ją zadając pytania!
          </p>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden" style={{ maxHeight: "calc(100vh - 350px)" }}>
        <ChatHistory messages={messages} />
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 border-t border-white/10">
        {room.activeMessageId && (
          <VotingPanel room={room} userId={userId} players={players} />
        )}

        {isMyTurn && !me?.hasGuessed && (
          <TurnActions
            roomId={room._id}
            userId={userId}
            hasActiveVote={!!room.activeMessageId}
          />
        )}

        {!isMyTurn && !room.activeMessageId && (
          <div className="text-center py-3">
            <p className="text-white/30 text-sm">
              Czekaj na {currentPlayer?.name ?? "następnego gracza"}...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
