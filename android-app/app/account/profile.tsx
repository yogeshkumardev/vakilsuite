import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Action, Caption, Input, Notice } from "@/components/auth/AuthUI";
import { Screen, Title } from "@/components/ui/Screen";
import { updateProfile } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState(user?.full_name ?? "");
  const [mobile, setMobile] = useState(user?.mobile_number ?? "");
  const [enrollment, setEnrollment] = useState(user?.enrollment_number ?? "");
  const [submitted, setSubmitted] = useState(false);
  const invalid = !name.trim() || Boolean(mobile && (mobile.trim().length < 10 || mobile.trim().length > 20));
  const mutation = useMutation({ mutationFn: () => updateProfile({ full_name: name.trim(), mobile_number: mobile.trim() || undefined, enrollment_number: enrollment.trim() }) });
  return <Screen><Title>Personal details</Title><Caption>{user?.email}</Caption>
    <Input label="Full name" value={name} onChangeText={setName} maxLength={200} error={submitted && !name.trim() ? "Enter your full name." : undefined} />
    <Input label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={20} error={submitted && mobile.length > 0 && mobile.trim().length < 10 ? "Enter a valid mobile number." : undefined} />
    <Input label="Enrollment number" value={enrollment} onChangeText={setEnrollment} maxLength={100} />
    <Notice>{mutation.error?.message}</Notice>{mutation.isSuccess && <Notice success>Profile saved.</Notice>}
    <Action loading={mutation.isPending} onPress={() => { setSubmitted(true); if (!invalid) mutation.mutate(); }}>Save changes</Action>
  </Screen>;
}
