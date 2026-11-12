"use client";

import { User } from "@/types/api";
import { create } from "zustand";
import { useChamberStore } from "@/store/chamber.store";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  generation: number;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  generation: 0,
  setAuth: (user, accessToken) => set((state) => ({ user, accessToken, isHydrated: true, generation: state.user?.id !== user.id ? state.generation + 1 : state.generation })),
  clearAuth: () => {
    useChamberStore.getState().clear();
    set((state) => ({ user: null, accessToken: null, isHydrated: true, generation: state.generation + 1 }));
  },
  setHydrated: () => set({ isHydrated: true }),
}));
