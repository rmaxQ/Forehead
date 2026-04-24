"use client";

import { useNotesStore } from "@/store/notesStore";

interface Props {
  roomId: string;
}

export default function NotesPanel({ roomId }: Props) {
  const notes = useNotesStore((s) => s.notes[roomId] ?? "");
  const setNote = useNotesStore((s) => s.setNote);

  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      <p className="text-sm text-white/40 uppercase tracking-wider">📝 Notatki</p>
      <textarea
        className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-base text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-cyan-500/40 transition-colors"
        placeholder="Zapisz swoje spostrzeżenia..."
        value={notes}
        onChange={(e) => setNote(roomId, e.target.value)}
      />
    </div>
  );
}
