"use client";

import { useEffect, useRef } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  messages: Doc<"messages">[];
  userId: Id<"users">;
}

export default function MyQuestionsPanel({ messages, userId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // Pair each of my questions/guesses with the answer that followed
  const pairs: Array<{ question: Doc<"messages">; answer: Doc<"messages"> | null }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    if (msg.authorId !== userId || (msg.type !== "question" && msg.type !== "guess_attempt")) {
      continue;
    }
    let answer: Doc<"messages"> | null = null;
    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (next.type === "answer" || next.type === "system") {
        answer = next;
        break;
      }
      if (next.type === "question" || next.type === "guess_attempt") break;
    }
    pairs.push({ question: msg, answer });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pairs.length]);

  return (
    <div className="flex flex-col gap-2 p-3 h-full overflow-hidden">
      <p className="text-sm text-white/40 uppercase tracking-wider shrink-0">🗒️ Moje pytania</p>
      <div className="flex-1 overflow-y-auto space-y-2">
        {pairs.length === 0 ? (
          <p className="text-white/20 text-sm text-center pt-4">Jeszcze nic nie zadałeś</p>
        ) : (
          pairs.map(({ question, answer }, i) => (
            <div
              key={question._id}
              className={cn(
                "rounded-xl px-3 py-2 space-y-1",
                question.type === "question"
                  ? "bg-cyan-500/10 border border-cyan-500/20"
                  : "bg-amber-400/10 border border-amber-400/20"
              )}
            >
              {/* Question / guess */}
              <p className="text-white/30 text-xs mb-0.5">
                {i + 1}. {question.type === "question" ? "❓" : "🎯"}
              </p>
              <p className={cn(
                "text-sm",
                question.type === "question" ? "text-white/80" : "text-amber-200/80"
              )}>
                {question.content}
              </p>

              {/* Answer */}
              {answer ? (
                <p className={cn(
                  "text-sm font-semibold pt-1 border-t border-white/10",
                  answer.content.includes("TAK") && "text-emerald-400",
                  answer.content.includes("NIE") && "text-red-400",
                  answer.content.includes("ZALEŻY") && "text-yellow-400",
                  answer.content.includes("poprawna") && "text-red-400",
                  !answer.content.includes("TAK") && !answer.content.includes("NIE") &&
                    !answer.content.includes("ZALEŻY") && !answer.content.includes("poprawna") &&
                    "text-white/60"
                )}>
                  {answer.content}
                </p>
              ) : (
                <p className="text-white/20 text-xs pt-1 border-t border-white/10">⏳ oczekuje na głosy...</p>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
