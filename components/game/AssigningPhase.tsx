"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  room: Doc<"rooms">;
  userId: Id<"users">;
}

export default function AssigningPhase({ room, userId }: Props) {
  const router = useRouter();
  const [character, setCharacter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dialog, setDialog] = useState<"leave" | "reset" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const players = useQuery(api.users.getPlayers, { roomId: room._id });
  const assignCharacter = useMutation(api.users.assignCharacter);
  const leaveRoom = useMutation(api.rooms.leaveRoom);
  const forceResetToLobby = useMutation(api.rooms.forceResetToLobby);

  if (!players) return null;

  const me = players.find((p) => p._id === userId);
  if (!me) return null;

  const isHost = room.hostId === userId;

  const assignedCount = players.filter((p) => p.assignedCharacter !== undefined).length;
  const progress = (assignedCount / players.length) * 100;

  // Find my target (next player in order, wrapping around)
  const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
  const myIndex = sortedPlayers.findIndex((p) => p._id === userId);
  const targetPlayer = sortedPlayers[(myIndex + 1) % sortedPlayers.length];

  const alreadyAssigned = targetPlayer.assignedCharacter !== undefined || submitted;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!character.trim()) return;

    try {
      await assignCharacter({
        fromUserId: userId,
        toUserId: targetPlayer._id,
        character: character.trim(),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleLeave() {
    setActionLoading(true);
    try {
      await leaveRoom({ userId, roomId: room._id });
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
      setActionLoading(false);
    }
  }

  async function handleForceReset() {
    setActionLoading(true);
    try {
      await forceResetToLobby({ roomId: room._id, userId });
      setDialog(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Błąd");
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-cyan-900/20 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-black text-cyan-400">Czółko 🎭</h1>
          <p className="text-white/40 text-sm mt-1">Przypisywanie postaci</p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Postęp</span>
              <span className="text-cyan-400 font-bold">
                {assignedCount}/{players.length}
              </span>
            </div>
            <Progress value={progress} />
            <p className="text-white/40 text-xs text-center">
              {assignedCount < players.length
                ? "Czekaj, aż wszyscy przypiszą postacie..."
                : "Wszyscy gotowi! Gra zaraz się zacznie..."}
            </p>
          </CardContent>
        </Card>

        {/* Assignment form */}
        {!alreadyAssigned && !submitted ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Przypisz postać dla:{" "}
                <span className="text-cyan-400">{targetPlayer.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="np. Albert Einstein, Koteczek, Ziemniak..."
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <p className="text-white/30 text-xs">
                  Gracz nie zobaczy swojej postaci — będzie musiał ją zgadnąć!
                </p>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!character.trim()}
                >
                  Zatwierdź postać
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-white font-medium">Postać przypisana!</p>
              <p className="text-white/40 text-sm">
                Czekaj, aż pozostali gracze skończą...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Players status */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sortedPlayers.map((p) => (
            <div
              key={p._id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5"
            >
              <span className="text-sm">
                {p.assignedCharacter !== undefined ? "✅" : "⏳"}
              </span>
              <span className="text-sm text-white/70">
                {p.name}
                {p._id === userId && <span className="text-white/30 ml-1">(ty)</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Akcje wyjścia */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="ghost"
            className="flex-1 text-white/40 text-sm"
            onClick={() => setDialog("leave")}
          >
            🚪 Wyjdź z gry
          </Button>
          {isHost && (
            <Button
              variant="outline"
              className="flex-1 text-sm border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setDialog("reset")}
            >
              🔄 Resetuj do lobby
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "leave"}
        title="Wyjść z gry?"
        description="Opuścisz grę w trakcie przypisywania postaci. Pozostali gracze wrócą do lobby."
        confirmLabel="Wyjdź"
        onConfirm={handleLeave}
        onCancel={() => setDialog(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={dialog === "reset"}
        title="Zresetować grę?"
        description="Wszyscy gracze wrócą do lobby. Postęp przypisywania zostanie utracony."
        confirmLabel="Resetuj"
        onConfirm={handleForceReset}
        onCancel={() => setDialog(null)}
        loading={actionLoading}
      />
    </main>
  );
}
