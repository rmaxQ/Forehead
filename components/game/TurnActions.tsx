"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  roomId: Id<"rooms">;
  userId: Id<"users">;
  hasActiveVote: boolean;
}

export default function TurnActions({ roomId, userId, hasActiveVote }: Props) {
  const [mode, setMode] = useState<"question" | "guess">("question");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submitQuestion = useMutation(api.messages.submitQuestion);
  const submitGuess = useMutation(api.messages.submitGuessAttempt);

  if (hasActiveVote) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      if (mode === "question") {
        await submitQuestion({ userId, roomId, question: text.trim() });
      } else {
        await submitGuess({ userId, roomId, guessText: text.trim() });
      }
      setText("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
      <p className="text-center text-cyan-400 font-semibold text-sm animate-pulse-glow">
        🎯 Twoja tura!
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5">
        <button
          onClick={() => setMode("question")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === "question"
              ? "bg-cyan-500 text-black"
              : "text-white/50 hover:text-white"
          }`}
        >
          ❓ Zadaj pytanie
        </button>
        <button
          onClick={() => setMode("guess")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === "guess"
              ? "bg-amber-400 text-slate-900"
              : "text-white/50 hover:text-white"
          }`}
        >
          🎯 Zgaduję!
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            mode === "question"
              ? "Czy jestem rośliną?"
              : "Wpisz swoją odpowiedź..."
          }
          maxLength={300}
          autoComplete="off"
        />
        <Button
          type="submit"
          variant={mode === "question" ? "default" : "gold"}
          disabled={!text.trim() || loading}
          className="shrink-0"
        >
          {loading ? "..." : "Wyślij"}
        </Button>
      </form>
    </div>
  );
}
