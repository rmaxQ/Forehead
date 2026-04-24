"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  messages: Doc<"messages">[];
  userId: Id<"users">;
}

type Tab = "all" | "yes" | "no" | "depends";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "yes", label: "TAK" },
  { id: "no", label: "NIE" },
  { id: "depends", label: "ZALEŻY" },
];

function matchesTab(answer: Doc<"messages"> | null, tab: Tab): boolean {
  if (tab === "all") return true;
  if (!answer) return false;
  const c = answer.content;
  if (tab === "yes") return c.includes("TAK");
  if (tab === "no") return c.includes("NIE");
  if (tab === "depends") return c.includes("ZALEŻY");
  return false;
}

export default function MyQuestionsPanel({ messages, userId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);

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

  const filtered = pairs.filter(({ answer }) => matchesTab(answer, activeTab));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length]);

  return (
    <div className="flex flex-col gap-2 p-3 h-full overflow-hidden">
      <p className="text-sm text-white/40 uppercase tracking-wider shrink-0">🗒️ Moje pytania</p>

      {/* Tabs */}
      <div className="flex gap-1 shrink-0">
        {TABS.map((tab) => {
          const count =
            tab.id === "all"
              ? pairs.length
              : pairs.filter(({ answer }) => matchesTab(answer, tab.id)).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 text-xs py-1 rounded-lg border transition-colors",
                activeTab === tab.id
                  ? tab.id === "yes"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : tab.id === "no"
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : tab.id === "depends"
                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                    : "bg-white/10 border-white/20 text-white/80"
                  : "bg-transparent border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-0.5 opacity-60">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <p className="text-white/20 text-sm text-center pt-4">
            {activeTab === "all" ? "Jeszcze nic nie zadałeś" : "Brak pytań z tą odpowiedzią"}
          </p>
        ) : (
          filtered.map(({ question, answer }, i) => (
            <div
              key={question._id}
              className={cn(
                "rounded-xl px-3 py-2 space-y-1",
                question.type === "question"
                  ? "bg-cyan-500/10 border border-cyan-500/20"
                  : "bg-amber-400/10 border border-amber-400/20"
              )}
            >
              <p className="text-white/30 text-xs mb-0.5">
                {i + 1}. {question.type === "question" ? "❓" : "🎯"}
              </p>
              <p className={cn(
                "text-sm",
                question.type === "question" ? "text-white/80" : "text-amber-200/80"
              )}>
                {question.content}
              </p>

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
