"use client";

import { create } from "zustand";

export type ChamberRole = "owner" | "admin" | "staff" | "reviewer";

export interface ChamberSelection {
  id: string;
  name: string;
  role: ChamberRole;
}

interface ChamberState {
  selected: ChamberSelection | null;
  setSelected: (selected: ChamberSelection | null) => void;
  clear: () => void;
}

export const useChamberStore = create<ChamberState>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),
  clear: () => set({ selected: null }),
}));
