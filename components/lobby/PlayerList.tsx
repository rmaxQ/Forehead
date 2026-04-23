import { Doc, Id } from "@/convex/_generated/dataModel";

interface Props {
  players: Doc<"users">[];
  hostId: Id<"users"> | undefined;
  currentUserId: Id<"users">;
}

export default function PlayerList({ players, hostId, currentUserId }: Props) {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player._id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
        >
          <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-sm font-bold text-fuchsia-300">
            {player.name[0].toUpperCase()}
          </div>
          <span className="flex-1 text-white font-medium">
            {player.name}
            {player._id === currentUserId && (
              <span className="ml-2 text-white/40 text-xs">(ty)</span>
            )}
          </span>
          {player._id === hostId && (
            <span className="text-amber-400 text-xs font-semibold">HOST</span>
          )}
        </div>
      ))}
    </div>
  );
}
