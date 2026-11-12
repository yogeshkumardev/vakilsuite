import { create } from "zustand";

import { User } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isBootstrapping: boolean;
  generation: number;
  scopeGeneration: number;
  chamberId: string | null;
  chamberName: string | null;
  chamberRole: "owner" | "admin" | "staff" | "reviewer" | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: User | null) => void;
  setBootstrapping: (value: boolean) => void;
  clearAuth: () => void;
  setChamber: (chamber: { id: string; name: string; role: "owner" | "admin" | "staff" | "reviewer" } | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,
  generation: 0,
  scopeGeneration: 0,
  chamberId: null,
  chamberName: null,
  chamberRole: null,
  setAuth: (user, accessToken) => set((state) => ({
    user,
    accessToken,
    generation: state.generation + 1,
    scopeGeneration: state.user?.id === user.id ? state.scopeGeneration : state.scopeGeneration + 1,
  })),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clearAuth: () => set((state) => ({ user: null, accessToken: null, chamberId: null, chamberName: null, chamberRole: null, generation: state.generation + 1, scopeGeneration: state.scopeGeneration + 1 })),
  setChamber: (chamber) => set((state) => ({
    chamberId: chamber?.id ?? null,
    chamberName: chamber?.name ?? null,
    chamberRole: chamber?.role ?? null,
    scopeGeneration: state.chamberId === (chamber?.id ?? null) ? state.scopeGeneration : state.scopeGeneration + 1,
  })),
}));
