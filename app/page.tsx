"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const [, setUserId] = useLocalStorage<string | null>("czulko_userId", null);
  const [, setRoomCode] = useLocalStorage<string | null>("czulko_roomCode", null);

  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [createError, setCreateError] = useState("");

  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const result = await createRoom({ userName: createName.trim() });
      setUserId(result.userId);
      setRoomCode(result.roomCode);
      router.push(`/room/${result.roomCode}`);
    } catch (err: unknown) {
      console.error("createRoom error:", err);
      setCreateError(err instanceof Error ? err.message : "Błąd podczas tworzenia pokoju");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      const result = await joinRoom({ code: joinCode.trim(), userName: joinName.trim() });
      setUserId(result.userId);
      setRoomCode(joinCode.trim().toUpperCase());
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err: unknown) {
      console.error("joinRoom error:", err);
      setJoinError(err instanceof Error ? err.message : "Błąd podczas dołączania do pokoju");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tight">
            <span className="text-cyan-400">Czółko</span>
            <span className="ml-2">🎭</span>
          </h1>
          <p className="text-white/50 text-sm">
            Zgadnij, kim jesteś — zanim zrobi to reszta!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-cyan-400">✦</span> Stwórz pokój
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                placeholder="Twój nick"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />
              {createError && (
                <p className="text-red-400 text-sm px-1">{createError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={creating || !createName.trim()}
              >
                {creating ? "Tworzę pokój..." : "Stwórz pokój"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-amber-400">✦</span> Dołącz do pokoju
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-3">
              <Input
                placeholder="Kod pokoju (np. KOTKI)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoComplete="off"
                className="tracking-widest uppercase"
              />
              <Input
                placeholder="Twój nick"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />
              {joinError && (
                <p className="text-red-400 text-sm px-1">{joinError}</p>
              )}
              <Button
                type="submit"
                variant="gold"
                className="w-full"
                size="lg"
                disabled={joining || !joinCode.trim() || !joinName.trim()}
              >
                {joining ? "Dołączam..." : "Dołącz do gry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-white/30 text-xs">
          Gra dla 2–10 osób • Działa na telefonie
        </p>
      </div>
    </main>
  );
}
