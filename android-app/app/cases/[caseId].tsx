import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useCallback, useState } from "react";
import { DocumentViewer, type ViewerFile } from "@/components/DocumentViewer";

import { Button, Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { getCase } from "@/lib/api/cases";
import { listDocuments } from "@/lib/api/documents";
import { apiClient } from "@/lib/api/client";
import { listWorkingDocuments } from "@/lib/api/workingDocuments";


export default function CaseDetailScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [viewing, setViewing] = useState<ViewerFile | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  const caseQuery = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => getCase(caseId),
    enabled: Boolean(caseId),
    refetchInterval: 15000,
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => listDocuments(caseId),
    enabled: Boolean(caseId),
    refetchInterval: 15000,
  });

  const permissions = useQuery({ queryKey: ["permissions", caseId], queryFn: () => apiClient.get<{ can_edit: boolean }>(`/cases/${caseId}/permissions`), refetchInterval: 15000 });
  const workingDocumentsQuery = useQuery({ queryKey: ["working-documents", caseId], queryFn: () => listWorkingDocuments(caseId), enabled: Boolean(caseId) });

  if (caseQuery.isLoading) {
    return (
      <Screen>
        <Muted>Loading case...</Muted>
      </Screen>
    );
  }

  const item = caseQuery.data?.case;

  if (caseQuery.error || !item) return <Screen><Muted>{caseQuery.error?.message ?? "Case unavailable."}</Muted><Button onPress={() => router.replace("/(tabs)/cases")}>Back to cases</Button></Screen>;

  return (
    <Screen refreshing={documentsQuery.isRefetching} onRefresh={() => { void caseQuery.refetch(); void documentsQuery.refetch(); void workingDocumentsQuery.refetch(); void permissions.refetch(); }}>
      <View style={{ gap: 8 }}>
        <Title>{item?.case_title ?? "Case"}</Title>
        {item && (
          <Muted>
            {item.petitioner_name} vs {item.respondent_name}
          </Muted>
        )}
      </View>

      {documentsQuery.error && <Text style={{ color: "#B42332" }}>{documentsQuery.error.message}</Text>}
      <View style={{ gap: 10 }}><Button variant="secondary" onPress={() => router.push(`/cases/${caseId}/clients`)}>Matter clients</Button><Button variant="secondary" onPress={() => router.push(`/cases/${caseId}/fees`)}>Fee ledger</Button><Button variant="secondary" onPress={() => router.push(`/cases/${caseId}/summary`)}>Case Summary</Button></View>
      {permissions.data?.can_edit && <View style={{ gap: 10 }}><Button onPress={() => router.push(`/cases/${caseId}/import-pdf`)}>Upload</Button><Button onPress={() => router.push(`/cases/${caseId}/scan`)}>Scan</Button></View>}

      <View style={{ gap: 14 }}>
        <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>
          Documents
        </Text>
        {documentsQuery.isLoading && <Muted>Loading documents...</Muted>}
        {documentsQuery.data?.documents.length === 0 && (
          <Muted>No documents uploaded yet.</Muted>
        )}
        {documentsQuery.data?.documents.map((document) => (
          <Card key={document.id}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${document.original_filename}`} disabled={document.upload_status !== "uploaded"} onPress={() => setViewing({ documentId: document.id, name: document.original_filename, mime: document.mime_type })}><Text style={{ color: "#126B5D", fontWeight: "600", textDecorationLine: "underline", paddingVertical: 10 }}>{document.original_filename}</Text></Pressable>
            <Muted>
              {document.upload_status} · {(document.file_size_bytes / 1024).toFixed(1)} KB
            </Muted>
            {document.upload_status !== "uploaded" && <Muted>Upload is incomplete. Retry from the scan library or the original uploader.</Muted>}
          </Card>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "700" }}>Drafts</Text>
        {workingDocumentsQuery.isLoading && <Muted>Loading drafts...</Muted>}
        {workingDocumentsQuery.data?.length === 0 && <Muted>Create a draft in the web workspace, then open it here.</Muted>}
        {workingDocumentsQuery.data?.map((document) => <Card key={document.id}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/cases/[caseId]/working-document-editor", params: { caseId, documentId: document.id, title: document.title } })}><Text style={{ color: "#126B5D", fontWeight: "700", paddingVertical: 8 }}>{document.title}</Text><Muted>Revision {document.latest_revision_number ?? 0} · Open editor</Muted></Pressable></Card>)}
      </View>
      {viewing && <DocumentViewer file={viewing} onClose={closeViewer} />}
    </Screen>
  );
}
