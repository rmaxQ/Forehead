"use client";

import { useEffect, useRef } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  messages: Doc<"messages">[];
}

export default function ChatHistory({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-sm">Jeszcze żadnych pytań...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 px-1">
      {messages.map((msg, i) => (
        <div
          key={msg._id}
          className={cn(
            "animate-slide-in rounded-xl px-4 py-3 text-sm",
            msg.type === "system" || msg.type === "answer"
              ? "bg-white/5 text-white/60 text-center italic"
              : msg.type === "question"
              ? "bg-fuchsia-500/10 border border-fuchsia-500/20"
              : "bg-amber-400/10 border border-amber-400/20"
          )}
          style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
        >
          {msg.type === "question" && (
            <p className="text-fuchsia-300 font-semibold text-xs mb-1">
              ❓ {msg.authorName} pyta:
            </p>
          )}
          {msg.type === "guess_attempt" && (
            <p className="text-amber-300 font-semibold text-xs mb-1">
              🎯 {msg.authorName} zgaduje:
            </p>
          )}
          <p
            className={cn(
              msg.type === "question" && "text-white",
              msg.type === "guess_attempt" && "text-white",
              msg.type === "system" && "text-white/60",
              msg.type === "answer" && "text-white font-bold text-base"
            )}
          >
            {msg.content}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
