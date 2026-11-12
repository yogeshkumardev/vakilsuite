import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useState } from "react";
import { Button, Card, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { linkMatterClient, listClients, listMatterClients } from "@/lib/api/matters";

export default function MatterClientsScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const cache = useQueryClient(); const [search, setSearch] = useState("");
  const linked = useQuery({ queryKey: ["matter-clients", caseId], queryFn: () => listMatterClients(caseId), enabled: Boolean(caseId) });
  const candidates = useQuery({ queryKey: ["clients", search], queryFn: () => listClients(search), enabled: search.trim().length > 1 });
  const link = useMutation({ mutationFn: (clientId: string) => linkMatterClient(caseId, clientId), onSuccess: () => cache.invalidateQueries({ queryKey: ["matter-clients", caseId] }) });
  return <Screen><Title>Matter clients</Title><Muted>Contacts remain separate from court parties.</Muted>
    <Field label="Find client" value={search} onChangeText={setSearch} placeholder="Search name" />
    {candidates.data?.map((item) => <Card key={item.id}><Text style={{ fontWeight: "700" }}>{item.full_name}</Text><Button loading={link.isPending} onPress={() => link.mutate(item.id)}>Link client</Button></Card>)}
    <Text style={{ fontWeight: "700" }}>Linked</Text>{linked.data?.map((item) => <Card key={item.client_id}><Text>{item.client.full_name}</Text></Card>)}{!linked.data?.length && <Muted>No clients linked.</Muted>}
  </Screen>;
}
