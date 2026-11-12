import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "react-native";
import { useState } from "react";

import { Button, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { createPreFilingMatter } from "@/lib/api/matters";

export default function NewMatterScreen() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useMutation({
    mutationFn: () => createPreFilingMatter(title.trim(), notes.trim() || undefined),
    onSuccess: async (matter) => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.replace(`/cases/${matter.id}`);
    },
  });
  return <Screen><Title>New Matter</Title><Muted>Start intake before a court number or parties are known.</Muted>
    <Field label="Matter title" value={title} onChangeText={setTitle} placeholder="Advice on property dispute" maxLength={500} />
    <Field label="Initial notes (optional)" value={notes} onChangeText={setNotes} placeholder="What is known so far?" maxLength={10000} multiline />
    {mutation.error && <Text style={{ color: "#dc2626" }}>{mutation.error.message}</Text>}
    <Button loading={mutation.isPending} disabled={title.trim().length < 3} onPress={() => mutation.mutate()}>Create Matter</Button>
  </Screen>;
}
