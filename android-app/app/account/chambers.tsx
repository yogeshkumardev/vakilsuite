import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button, Card, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { chambersApi, type ChamberRole } from "@/lib/api/chambers";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";

const roles: ChamberRole[] = ["admin", "staff", "reviewer"];
export default function ChambersScreen() {
  const { chamberId, chamberName, chamberRole, setChamber } = useAuthStore(); const cache = useQueryClient();
  const [userId, setUserId] = useState(""); const [role, setRole] = useState<ChamberRole>("staff");
  const chambers = useQuery({ queryKey: ["chambers"], queryFn: chambersApi.list });
  const activeId = chamberId ?? chambers.data?.[0]?.id;
  const active = chambers.data?.find((item) => item.id === activeId);
  useEffect(() => { if (!chamberId && active) setChamber({ id: active.id, name: active.name, role: active.membership.role }); }, [active, chamberId, setChamber]);
  const members = useQuery({ queryKey: ["chamber-members", activeId], queryFn: () => chambersApi.members(activeId!), enabled: Boolean(activeId) });
  const canManage = (chamberRole ?? active?.membership.role) === "owner" || (chamberRole ?? active?.membership.role) === "admin";
  const add = useMutation({ mutationFn: () => chambersApi.add(activeId!, userId, role), onSuccess: () => { setUserId(""); void cache.invalidateQueries({ queryKey: ["chamber-members", activeId] }); } });
  const revoke = useMutation({ mutationFn: (memberId: string) => chambersApi.update(activeId!, memberId, { revoke: true }), onSuccess: () => void cache.invalidateQueries({ queryKey: ["chamber-members", activeId] }) });
  return <Screen><Title>Chamber & members</Title><Muted>Choose where you are working. Access changes take effect immediately.</Muted>{chambers.isLoading ? <Muted>Loading chambers…</Muted> : <><Card><Text style={s.label}>Active chamber</Text><Picker selectedValue={activeId} onValueChange={(id) => { const chamber = chambers.data?.find((item) => item.id === id); if (chamber) setChamber({ id: chamber.id, name: chamber.name, role: chamber.membership.role }); }}>{chambers.data?.map((item) => <Picker.Item key={item.id} label={`${item.name} · ${item.membership.role}`} value={item.id} />)}</Picker></Card>{active && <Card><Text style={s.name}>{chamberName ?? active.name}</Text><Muted>Your role: {chamberRole ?? active.membership.role}</Muted></Card>}{canManage && <Card><Text style={s.label}>Add existing member</Text><Field label="User UUID" value={userId} onChangeText={setUserId} placeholder="Paste user UUID" autoCapitalize="none" /><Picker selectedValue={role} onValueChange={(value) => setRole(value as ChamberRole)}>{roles.map((item) => <Picker.Item key={item} label={item} value={item} />)}</Picker><Button loading={add.isPending} onPress={() => { if (userId.trim()) add.mutate(); }}>Add member</Button>{add.error && <Text style={s.error}>{add.error.message}</Text>}</Card>}<Card><Text style={s.label}>Members</Text>{members.isLoading ? <Muted>Loading members…</Muted> : members.data?.map((member) => <View key={member.id} style={s.member}><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.id}>{member.user_id}</Text><Muted>{member.role} · {member.status}</Muted></View>{canManage && member.role !== "owner" && member.status === "active" && <Pressable accessibilityRole="button" accessibilityLabel="Revoke member" onPress={() => Alert.alert("Revoke member?", "They will lose new chamber access immediately.", [{ text: "Cancel", style: "cancel" }, { text: "Revoke", style: "destructive", onPress: () => revoke.mutate(member.id) }])}><Text style={s.revoke}>Revoke</Text></Pressable>}</View>)}</Card></>}</Screen>;
}
const s = StyleSheet.create({ label: { fontSize: 14, fontWeight: "700", color: "#182626" }, name: { fontSize: 17, fontWeight: "700", color: "#182626" }, member: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#DCE4E1" }, id: { fontSize: 12, color: "#182626" }, revoke: { color: "#B42332", fontWeight: "700", padding: 8 }, error: { color: "#B42332", marginTop: 8 } });
