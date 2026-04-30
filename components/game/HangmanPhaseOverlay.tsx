"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
  players: Doc<"users">[];
  me?: Doc<"users">;
}

export function HangmanWordDisplay({
  character,
  revealedLetters,
}: {
  character: string;
  revealedLetters: string[];
}) {
  const words = character.toUpperCase().split(" ");
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {words.map((word, wi) => (
        <div key={wi} className="flex gap-1">
          {word.split("").map((ch, ci) => {
            const isLetter = /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(ch);
            const revealed = isLetter && revealedLetters.includes(ch);
            return (
              <span key={ci} className="flex flex-col items-center min-w-[18px]">
                <span className="text-base font-mono font-bold text-cyan-300 text-center leading-6">
                  {revealed ? ch : isLetter ? "_" : ch}
                </span>
                {isLetter && <span className="block w-full h-px bg-white/40 mt-0.5" />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function HangmanPhaseOverlay({ room, userId, players, me }: Props) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const submitLetter = useMutation(api.rooms.submitHangmanLetter);

  const activePlayers = players.filter((p) => !p.hasGuessed && !p.hasSurrendered);
  const submittedCount = activePlayers.filter((p) => p.hangmanLetterSubmitted === true).length;
  const totalCount = activePlayers.length;
  const mySubmitted = me?.hangmanLetterSubmitted === true;
  const roundNumber = room.currentRound ?? 1;

  async function handleSubmit() {
    if (!letter || loading) return;
    setLoading(true);
    try {
      await submitLetter({ userId, roomId: room._id, letter });
      setLetter("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-cyan-500/30 bg-[#030d1a] shadow-xl shadow-cyan-900/20 p-6 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs text-cyan-500/70 uppercase tracking-widest font-medium">Tryb Wisielca</p>
          <h2 className="text-xl font-black text-white">Runda {roundNumber}</h2>
          <p className="text-white/50 text-sm">Zgadnij literę ze swojej postaci!</p>
        </div>

        {me?.assignedCharacter && (
          <div className="bg-white/5 rounded-xl p-4 flex justify-center">
            <HangmanWordDisplay
              character={me.assignedCharacter}
              revealedLetters={me.revealedLetters ?? []}
            />
          </div>
        )}

        {!mySubmitted ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={letter}
                onChange={(e) => setLetter(e.target.value.toUpperCase().replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, "").slice(0, 1))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="A"
                maxLength={1}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl font-black text-white uppercase tracking-widest focus:outline-none focus:border-cyan-500/60 focus:bg-white/15 transition-all"
                disabled={loading}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!letter || loading}
                className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-black transition-colors"
              >
                {loading ? "..." : "Wyślij"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-emerald-400 font-semibold">✅ Wysłano! Czekaj na pozostałych...</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/40">
            <span>Postęp</span>
            <span>{submittedCount} / {totalCount}</span>
          </div>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {activePlayers.map((p) => (
              <div
                key={p._id}
                title={p.name}
                className={`w-2 h-2 rounded-full transition-colors ${
                  p.hangmanLetterSubmitted ? "bg-cyan-400" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
