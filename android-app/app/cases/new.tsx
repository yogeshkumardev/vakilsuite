import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { Button, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { createCase } from "@/lib/api/cases";
import { CASE_TYPE_LABELS, CaseType } from "@/types/api";

export default function NewCaseScreen() {
  const queryClient = useQueryClient();
  const [caseTitle, setCaseTitle] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("bail_application");
  const [petitionerName, setPetitionerName] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createCase({
        case_title: caseTitle.trim(),
        case_type: caseType,
        petitioner_name: petitionerName.trim(),
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.replace(`/cases/${data.case.id}`);
    },
  });

  return (
    <Screen>
      <Title>New Case</Title>
      <Muted>Basic information</Muted>
      <Field
        label="Case Title"
        onChangeText={setCaseTitle}
        placeholder="John Doe Bail Application 2026"
        value={caseTitle}
        maxLength={500}
      />
      <Text style={{ color: "#334155", fontWeight: "600" }}>Case Type</Text>
      <Picker accessibilityLabel="Case Type" selectedValue={caseType} onValueChange={setCaseType} enabled={!createMutation.isPending}>
        {(Object.entries(CASE_TYPE_LABELS) as [CaseType, string][]).map(([value, label]) => <Picker.Item key={value} label={label} value={value} />)}
      </Picker>
      <Field
        label="Petitioner Name"
        onChangeText={setPetitionerName}
        placeholder="Full name"
        value={petitionerName}
        maxLength={500}
      />
      {createMutation.error && (
        <Text style={{ color: "#dc2626" }}>{createMutation.error.message}</Text>
      )}
      <Button
        loading={createMutation.isPending}
        disabled={caseTitle.trim().length < 3 || !petitionerName.trim()}
        onPress={() => createMutation.mutate()}
      >
        Create Case
      </Button>
    </Screen>
  );
}
