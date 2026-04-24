"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
  players: Doc<"users">[];
}

export default function VotingPanel({ room, userId, players }: Props) {
  const submitVote = useMutation(api.votes.submitVote);
  const votes = useQuery(
    api.votes.getVotes,
    room.activeMessageId ? { messageId: room.activeMessageId } : "skip"
  );
  const messages = useQuery(api.messages.getMessages, { roomId: room._id });

  if (!room.activeMessageId || !votes || !messages) return null;

  const activeMessage = messages.find((m) => m._id === room.activeMessageId);
  if (!activeMessage) return null;

  const isGuesser = room.currentTurnUserId === userId;
  const myVote = votes.find((v) => v.voterId === userId);

  const yesCount = votes.filter((v) => v.vote === "yes").length;
  const noCount = votes.filter((v) => v.vote === "no").length;
  const dependsCount = votes.filter((v) => v.vote === "depends").length;
  // Wszyscy gracze poza aktywnym mogą głosować (w tym wygrywający)
  const voters = players.filter((p) => p._id !== room.currentTurnUserId);
  const total = voters.length;

  const isGuess = activeMessage.type === "guess_attempt";

  async function handleVote(vote: "yes" | "no" | "depends") {
    if (isGuesser) return;
    try {
      await submitVote({ voterId: userId, roomId: room._id, vote });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd głosowania");
    }
  }

  const voteLabel =
    myVote?.vote === "yes"
      ? "TAK ✅"
      : myVote?.vote === "no"
      ? "NIE ❌"
      : myVote?.vote === "depends"
      ? "ZALEŻY 🤷"
      : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
      <div className="text-center">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
          {isGuess ? "🎯 Próba zgadnięcia" : "❓ Pytanie"}
        </p>
        <p className="text-white font-semibold">{activeMessage.content}</p>
      </div>

      {/* Vote counts */}
      <div className="flex gap-2 justify-center text-sm flex-wrap">
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          TAK: {yesCount}
        </span>
        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
          NIE: {noCount}
        </span>
        {!isGuess && (
          <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            ZALEŻY: {dependsCount}
          </span>
        )}
        <span className="px-3 py-1 rounded-full bg-white/10 text-white/40">
          /{total}
        </span>
      </div>

      {/* Voting buttons */}
      {!isGuesser && (
        <div className="flex gap-2">
          <Button
            variant="success"
            className="flex-1"
            onClick={() => handleVote("yes")}
            disabled={myVote?.vote === "yes"}
          >
            {isGuess ? "✅ Tak!" : "✅ TAK"}
          </Button>
          {!isGuess && (
            <Button
              variant="outline"
              className="flex-1 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
              onClick={() => handleVote("depends")}
              disabled={myVote?.vote === "depends"}
            >
              🤷 ZALEŻY
            </Button>
          )}
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => handleVote("no")}
            disabled={myVote?.vote === "no"}
          >
            {isGuess ? "❌ Nie" : "❌ NIE"}
          </Button>
        </div>
      )}

      {isGuesser && (
        <p className="text-center text-white/40 text-sm">
          Czekaj na odpowiedź pozostałych graczy...
        </p>
      )}

      {voteLabel && !isGuesser && (
        <p className="text-center text-white/30 text-xs">
          Twój głos: {voteLabel} — możesz zmienić
        </p>
      )}
    </div>
  );
}
