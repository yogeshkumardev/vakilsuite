"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  casesApi,
  CreateCaseRequest,
  UpdateCaseRequest,
  ListCasesParams,
} from "@/lib/api/cases";
import { useChamberStore } from "@/store/chamber.store";

// Context query key (mirrors contextKeys.context in useContext.ts)
const contextKey = (caseId: string) => ["context", caseId] as const;

export const caseKeys = {
  all: ["cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (params: ListCasesParams) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: string) => [...caseKeys.details(), id] as const,
  sectionsHistory: (id: string) =>
    [...caseKeys.detail(id), "sections-history"] as const,
};

export function useCaseList(params: ListCasesParams = {}) {
  const chamberId = useChamberStore((state) => state.selected?.id);
  return useQuery({
    queryKey: [...caseKeys.list(params), chamberId],
    queryFn: () => casesApi.list(params),
    refetchInterval: 15000,
    staleTime: 30_000,
  });
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: caseKeys.detail(caseId),
    queryFn: () => casesApi.get(caseId),
    refetchInterval: 15000,
    staleTime: 30_000,
    enabled: !!caseId,
  });
}

export function useSectionsHistory(caseId: string) {
  return useQuery({
    queryKey: caseKeys.sectionsHistory(caseId),
    queryFn: () => casesApi.getSectionsHistory(caseId),
    enabled: !!caseId,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCaseRequest) => casesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: caseKeys.lists() }),
  });
}

export function useUpdateCase(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCaseRequest) => casesApi.update(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: caseKeys.lists() });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useArchiveCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (caseId: string) => casesApi.archive(caseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: caseKeys.lists() }),
  });
}

export function useAddCaseNumber(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof casesApi.addNumber>[1]) =>
      casesApi.addNumber(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useDeleteCaseNumber(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => casesApi.deleteNumber(numberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useAddSection(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof casesApi.addSection>[1]) =>
      casesApi.addSection(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: caseKeys.sectionsHistory(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useRemoveSection(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => casesApi.removeSection(sectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: caseKeys.sectionsHistory(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useAddParty(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof casesApi.addParty>[1]) =>
      casesApi.addParty(caseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}

export function useDeleteParty(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partyId: string) => casesApi.deleteParty(partyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caseKeys.detail(caseId) });
      qc.invalidateQueries({ queryKey: contextKey(caseId) });
    },
  });
}
