import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { apiClient } from "@/lib/api/client";

type ReviewItem = { revision_id: string; working_document_id: string; case_id: string; title: string; revision_number: number; created_at: string };

export default function ReviewInboxScreen() {
  const inbox = useQuery({ queryKey: ["working-document-review-inbox"], queryFn: () => apiClient.get<ReviewItem[]>("/cases/review-inbox") });
  return <Screen refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()}><Title>Review inbox</Title><Muted>Submitted document revisions awaiting a chamber reviewer.</Muted>{inbox.isLoading && <Muted>Loading review requests...</Muted>}{inbox.error && <Text style={{ color: "#B42332" }}>Unable to load reviews. Reviewer permission may be required.</Text>}{inbox.data?.length === 0 && <Muted>No submitted revisions need review.</Muted>}<View style={{ gap: 10 }}>{inbox.data?.map((item) => <Card key={item.revision_id}><Pressable accessibilityRole="button" accessibilityLabel={`Review ${item.title}`} onPress={() => router.push({ pathname: "/cases/[caseId]/working-document-editor", params: { caseId: item.case_id, documentId: item.working_document_id, title: item.title } })}><Text style={{ color: "#126B5D", fontWeight: "700", paddingVertical: 8 }}>{item.title}</Text><Muted>Revision {item.revision_number} · Review</Muted></Pressable></Card>)}</View></Screen>;
}
