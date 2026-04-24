import { create } from "zustand";

interface NotesStore {
  notes: Record<string, string>;
  setNote: (roomId: string, text: string) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes: {},
  setNote: (roomId, text) =>
    set((state) => ({ notes: { ...state.notes, [roomId]: text } })),
}));
