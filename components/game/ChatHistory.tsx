"use client";

import { useEffect, useRef } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  messages: Doc<"messages">[];
  players: Doc<"users">[];
  userId: Id<"users">;
}

export default function ChatHistory({ messages, players, userId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function getCharacter(authorId: Id<"users">): string | null {
    if (authorId === userId) return null;
    return players.find((p) => p._id === authorId)?.assignedCharacter ?? null;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-sm">Jeszcze żadnych pytań...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 px-1">
      {messages.map((msg, i) => {
        const character =
          msg.type === "question" || msg.type === "guess_attempt"
            ? getCharacter(msg.authorId)
            : null;

        return (
          <div
            key={msg._id}
            className={cn(
              "animate-slide-in rounded-xl px-4 py-3 text-base",
              msg.type === "system" || msg.type === "answer"
                ? "bg-white/5 text-white/60 text-center italic"
                : msg.type === "question"
                ? "bg-cyan-500/10 border border-cyan-500/20"
                : "bg-amber-400/10 border border-amber-400/20"
            )}
            style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
          >
            {msg.type === "question" && (
              <p className="text-cyan-300 font-semibold text-sm mb-1">
                ❓ {msg.authorName}
                {character && (
                  <span className="text-cyan-200/50 font-normal ml-1">({character})</span>
                )}{" "}
                pyta:
              </p>
            )}
            {msg.type === "guess_attempt" && (
              <p className="text-amber-300 font-semibold text-sm mb-1">
                🎯 {msg.authorName}
                {character && (
                  <span className="text-amber-200/50 font-normal ml-1">({character})</span>
                )}{" "}
                zgaduje:
              </p>
            )}
            <p
              className={cn(
                msg.type === "question" && "text-white",
                msg.type === "guess_attempt" && "text-white",
                msg.type === "system" && "text-white/60",
                msg.type === "answer" && "text-white font-bold text-lg"
              )}
            >
              {msg.content}
            </p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
