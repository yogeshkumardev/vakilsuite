import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { createClient, listClients } from "@/lib/api/matters";

export default function ClientsScreen() {
  const [name, setName] = useState("");
  const client = useQueryClient();
  const clients = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const create = useMutation({ mutationFn: () => createClient(name.trim()), onSuccess: async () => { setName(""); await client.invalidateQueries({ queryKey: ["clients"] }); } });
  return <Screen><Title>Clients</Title><Muted>Matching names are kept as separate contacts.</Muted>
    <Field label="New client" value={name} onChangeText={setName} placeholder="Full name" maxLength={300} />
    <Button loading={create.isPending} disabled={name.trim().length < 1} onPress={() => create.mutate()}>Save client</Button>
    {create.error && <Text style={{ color: "#dc2626" }}>{create.error.message}</Text>}
    <View style={{ gap: 8 }}>{clients.data?.map((item) => <Card key={item.id}><Text style={{ fontWeight: "700" }}>{item.full_name}</Text></Card>)}{!clients.data?.length && <Muted>No clients yet.</Muted>}</View>
  </Screen>;
}
