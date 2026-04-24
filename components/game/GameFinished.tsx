"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
}

export default function GameFinished({ room, userId }: Props) {
  const router = useRouter();
  const [cleaning, setCleaning] = useState(false);

  const players = useQuery(api.users.getPlayersWithCharacters, { roomId: room._id });
  const cleanupRoom = useMutation(api.rooms.cleanupFinishedRoom);

  if (!players) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40">Ładowanie...</div>
      </div>
    );
  }

  const sorted = [...players].sort((a, b) => {
    if (a.hasGuessed && !b.hasGuessed) return -1;
    if (!a.hasGuessed && b.hasGuessed) return 1;
    return a.order - b.order;
  });

  async function handleExit() {
    setCleaning(true);
    try {
      await cleanupRoom({ roomId: room._id });
    } catch {
      // Room might already be cleaned up
    }
    router.push("/");
  }

  async function handlePlayAgain() {
    toast.info("Wróć do strony głównej i stwórz nowy pokój!");
    await handleExit();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-amber-900/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-cyan-900/20 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="text-5xl">🏆</div>
          <h1 className="text-4xl font-black text-amber-400">Koniec gry!</h1>
          <p className="text-white/50 text-sm">Oto jak sobie wszyscy poradzili</p>
        </div>

        {/* Rankings */}
        <div className="space-y-3">
          {sorted.map((player, index) => (
            <Card
              key={player._id}
              className={
                player.hasGuessed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/20 bg-red-500/5"
              }
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {player.hasGuessed
                      ? index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : "🥉"
                      : "💀"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {player.name}
                      </span>
                      {player._id === userId && (
                        <span className="text-white/30 text-xs">(ty)</span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5">
                      {player.assignedCharacter ? (
                        <span
                          className={
                            player.hasGuessed ? "text-emerald-300" : "text-red-300"
                          }
                        >
                          {player.hasGuessed ? "✅" : "❌"}{" "}
                          <span className="font-medium italic">
                            {player.assignedCharacter}
                          </span>
                        </span>
                      ) : (
                        <span className="text-white/30">brak postaci</span>
                      )}
                    </div>
                  </div>
                  {!player.hasGuessed && (
                    <span className="text-red-400 text-xs font-medium shrink-0">
                      Nie zgadł
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="gold"
            className="w-full"
            size="lg"
            onClick={handlePlayAgain}
            disabled={cleaning}
          >
            🔄 Zagraj ponownie
          </Button>
          <Button
            variant="ghost"
            className="w-full text-white/40"
            onClick={handleExit}
            disabled={cleaning}
          >
            Wyjdź
          </Button>
        </div>
      </div>
    </main>
  );
}
