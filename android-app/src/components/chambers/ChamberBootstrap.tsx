import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { chambersApi } from "@/lib/api/chambers";
import { useAuthStore } from "@/store/auth.store";

/** Fetches the safe default once per signed-in app session. */
export function ChamberBootstrap() {
  const chamberId = useAuthStore((state) => state.chamberId);
  const setChamber = useAuthStore((state) => state.setChamber);
  const query = useQuery({ queryKey: ["chambers"], queryFn: chambersApi.list });

  useEffect(() => {
    if (!chamberId && query.data?.[0]) {
      const chamber = query.data[0];
      setChamber({ id: chamber.id, name: chamber.name, role: chamber.membership.role });
    }
  }, [chamberId, query.data, setChamber]);

  return null;
}
