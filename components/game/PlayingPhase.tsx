"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import ChatHistory from "./ChatHistory";
import TurnActions from "./TurnActions";
import VotingPanel from "./VotingPanel";
import PlayersSidebar from "./PlayersSidebar";
import NotesPanel from "./NotesPanel";
import MyQuestionsPanel from "./MyQuestionsPanel";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
}

export default function PlayingPhase({ room, userId }: Props) {
  const players = useQuery(api.users.getPlayers, { roomId: room._id });
  const messages = useQuery(api.messages.getMessages, { roomId: room._id });
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLeftOpen(!leftOpen); setRightOpen(false); }}
            className="lg:hidden text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded-lg border border-white/10 transition-colors"
          >
            👥
          </button>
          <h1 className="text-xl font-black text-cyan-400">Czółko 🎭</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-mono tracking-widest">{room.code}</span>
          <button
            onClick={() => { setRightOpen(!rightOpen); setLeftOpen(false); }}
            className="lg:hidden text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded-lg border border-white/10 transition-colors"
          >
            🗒️
          </button>
        </div>
      </div>

      {/*
        4-column layout (desktop ≥ lg):
          10% Players | 25% Notes | 40% Chat | 25% My questions

        Mobile: only Chat visible; sidebars are fixed drawers toggled via header buttons.
        On desktop, `lg:static` + `lg:w-[X%]` pull the drawers back into document flow.
      */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Col 1: Players (10%) — desktop only, always in flow ── */}
        <aside className="hidden lg:flex flex-col border-r border-white/10 overflow-hidden shrink-0 w-[10%]">
          <div className="p-2 border-b border-white/10 shrink-0">
            <p className="text-xs text-white/40 uppercase tracking-wider text-center">Gracze</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PlayersSidebar
              players={players}
              userId={userId}
              currentTurnUserId={room.currentTurnUserId}
            />
          </div>
        </aside>

        {/* ── Col 2: Notes (25%) ── */}
        {leftOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setLeftOpen(false)}
          />
        )}
        <aside
          className={cn(
            "flex flex-col border-r border-white/10 transition-transform duration-200",
            // Mobile: fixed drawer (out of flow)
            "fixed inset-y-0 left-0 z-50 w-72 bg-[#030d1a]",
            // Desktop: back in flow with correct width
            "lg:static lg:w-[25%] lg:bg-transparent lg:translate-x-0 lg:shrink-0",
            leftOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Mobile: players list at top of this drawer */}
          <div className="lg:hidden shrink-0 border-b border-white/10">
            <div className="p-2">
              <p className="text-xs text-white/40 uppercase tracking-wider">👥 Gracze</p>
            </div>
            <div className="max-h-52 overflow-y-auto">
              <PlayersSidebar
                players={players}
                userId={userId}
                currentTurnUserId={room.currentTurnUserId}
              />
            </div>
          </div>
          {/* Notes — fills remaining height */}
          <div className="flex-1 min-h-0 flex flex-col">
            <NotesPanel roomId={room._id} />
          </div>
        </aside>

        {/* ── Col 3: Chat (40%) ── */}
        <main className="flex-1 lg:flex-none lg:w-[40%] flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* {currentPlayer && !currentPlayer.hasGuessed && (
            <div className="px-4 py-2 bg-cyan-900/20 border-b border-cyan-500/20 shrink-0">
              <p className="text-cyan-300 text-sm text-center">
                {isMyTurn ? "🎯 Twoja tura!" : `🎲 Tura: ${currentPlayer.name}`}
              </p>
            </div>
          )}
          {me && !me.hasGuessed && (
            <div className="px-4 py-2 bg-amber-400/5 border-b border-amber-400/10 shrink-0">
              <p className="text-amber-300/60 text-xs text-center">
                👤 Twoja postać jest ukryta — zgadnij ją zadając pytania!
              </p>
            </div>
          )} */}
          <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
            <ChatHistory messages={messages} players={players} userId={userId} />
          </div>
          <div className="p-4 space-y-3 border-t border-white/10 shrink-0">
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

        {/* ── Col 4: My questions (25%) ── */}
        {rightOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setRightOpen(false)}
          />
        )}
        <aside
          className={cn(
            "flex flex-col border-l border-white/10 transition-transform duration-200",
            // Mobile: fixed drawer
            "fixed inset-y-0 right-0 z-50 w-64 bg-[#030d1a]",
            // Desktop: back in flow
            "lg:static lg:w-[25%] lg:bg-transparent lg:translate-x-0 lg:shrink-0",
            rightOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          <MyQuestionsPanel messages={messages} userId={userId} />
        </aside>
      </div>
    </div>
  );
}
