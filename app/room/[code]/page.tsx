"use client";

import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { Id } from "@/convex/_generated/dataModel";
import LobbyRoom from "@/components/lobby/LobbyRoom";
import AssigningPhase from "@/components/game/AssigningPhase";
import PlayingPhase from "@/components/game/PlayingPhase";
import GameFinished from "@/components/game/GameFinished";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [userId, , loaded] = useLocalStorage<string | null>("czulko_userId", null);
  const room = useQuery(api.rooms.getRoom, { code });

  if (!loaded) {
    return <LoadingScreen />;
  }

  if (room === undefined) {
    return <LoadingScreen />;
  }

  if (room === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-2xl">😕 Pokój nie istnieje</p>
          <button
            onClick={() => router.push("/")}
            className="text-cyan-400 underline"
          >
            Wróć do strony głównej
          </button>
        </div>
      </div>
    );
  }

  const typedUserId = userId as Id<"users"> | null;

  if (!typedUserId) {
    router.push("/");
    return <LoadingScreen />;
  }

  if (room.status === "lobby") {
    return <LobbyRoom room={room} userId={typedUserId} />;
  }

  if (room.status === "assigning") {
    return <AssigningPhase room={room} userId={typedUserId} />;
  }

  if (room.status === "playing") {
    return <PlayingPhase room={room} userId={typedUserId} />;
  }

  if (room.status === "finished") {
    return <GameFinished room={room} userId={typedUserId} />;
  }

  return <LoadingScreen />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-bounce">🎭</div>
        <p className="text-white/50">Ładowanie...</p>
      </div>
    </div>
  );
}
