"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerList from "./PlayerList";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
}

export default function LobbyRoom({ room, userId }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const players = useQuery(api.users.getPlayers, { roomId: room._id });
  const startGame = useMutation(api.rooms.startGame);
  const leaveRoom = useMutation(api.rooms.leaveRoom);

  const isHost = room.hostId === userId;
  const canStart = (players?.length ?? 0) >= 3;

  async function handleStart() {
    setStarting(true);
    try {
      await startGame({ roomId: room._id, hostId: userId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
      setStarting(false);
    }
  }

  async function handleLeave() {
    await leaveRoom({ userId, roomId: room._id });
    router.push("/");
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code);
    toast.success("Kod skopiowany!");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-black text-fuchsia-400">Czółko 🎭</h1>
          <p className="text-white/40 text-sm mt-1">Lobby</p>
        </div>

        {/* Room code */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-white/50 text-sm">Kod pokoju</p>
              <button
                onClick={copyCode}
                className="text-5xl font-black tracking-widest text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {room.code}
              </button>
              <p className="text-white/30 text-xs">kliknij, aby skopiować</p>
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 font-medium uppercase tracking-wider">
              Gracze ({players?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {players ? (
              <PlayerList
                players={players}
                hostId={room.hostId}
                currentUserId={userId}
              />
            ) : (
              <p className="text-white/30 text-sm">Ładowanie...</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {isHost ? (
          <div className="space-y-2">
            <Button
              onClick={handleStart}
              className="w-full"
              size="lg"
              disabled={!canStart || starting}
            >
              {starting ? "Rozpoczynam..." : "Rozpocznij grę"}
            </Button>
            {!canStart && (
              <p className="text-center text-white/40 text-xs">
                Potrzeba co najmniej 3 graczy ({(players?.length ?? 0)}/3)
              </p>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-white/50">⏳ Czekaj na hosta...</p>
            </CardContent>
          </Card>
        )}

        <Button variant="ghost" className="w-full text-white/40" onClick={handleLeave}>
          Opuść pokój
        </Button>
      </div>
    </main>
  );
}
