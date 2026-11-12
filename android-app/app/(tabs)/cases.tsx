import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Button, Card, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { listCases } from "@/lib/api/cases";
import { CASE_TYPE_LABELS } from "@/types/api";
import { useAuthStore } from "@/store/auth.store";

export default function CasesScreen() {
  const user = useAuthStore((state) => state.user);
  const chamberId = useAuthStore((state) => state.chamberId);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const casesQuery = useInfiniteQuery({
    queryKey: ["cases", chamberId, term],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listCases(pageParam, term),
    getNextPageParam: (last) => last.pagination.page < last.pagination.total_pages ? last.pagination.page + 1 : undefined,
    refetchInterval: 15000,
  });

  return (
    <Screen refreshing={casesQuery.isRefetching} onRefresh={() => void casesQuery.refetch()}>
      <View style={{ gap: 8 }}>
        <Title>Cases</Title>
        <Muted>{user?.role === "munshi" ? "Assigned cases" : "Your practice"}</Muted>
      </View>
      {user?.role !== "munshi" && <View style={{ gap: 8 }}><Button onPress={() => router.push("/cases/new")}>Create Case</Button><Button variant="secondary" onPress={() => router.push("/matters/new")}>Create pre-filing Matter</Button><Button variant="secondary" onPress={() => router.push("/clients")}>Clients</Button></View>}
      <Field label="Search cases" placeholder="Title or petitioner" value={search} onChangeText={setSearch} maxLength={200} autoCapitalize="none" />

      {casesQuery.isLoading && <Muted>Loading cases...</Muted>}
      {casesQuery.error && (
        <Text style={{ color: "#dc2626" }}>{casesQuery.error.message}</Text>
      )}
      {casesQuery.data?.pages[0]?.cases.length === 0 && (
        <Card>
          <Muted>{term ? "No matching cases." : "No cases yet."}</Muted>
        </Card>
      )}
      {casesQuery.data?.pages.flatMap((page) => page.cases).filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/cases/${item.id}`)}>
          <Card>
            <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>
              {item.case_title}
            </Text>
            <Muted>
              {item.petitioner_name} vs {item.respondent_name}
            </Muted>
            <Muted>{CASE_TYPE_LABELS[item.case_type]}</Muted>
          </Card>
        </Pressable>
      ))}
      {casesQuery.hasNextPage && <Button variant="secondary" loading={casesQuery.isFetchingNextPage} onPress={() => void casesQuery.fetchNextPage()}>Load More</Button>}
    </Screen>
  );
}
