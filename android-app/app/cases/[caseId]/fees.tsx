import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useState } from "react";
import { Button, Field, Muted, Screen, Title } from "@/components/ui/Screen";
import { createFeeAgreement, getFeeLedger } from "@/lib/api/matters";
const money = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
export default function MatterFeesScreen() { const { caseId } = useLocalSearchParams<{ caseId: string }>(); const cache = useQueryClient(); const [amount,setAmount]=useState(""); const ledger=useQuery({queryKey:["fees",caseId],queryFn:()=>getFeeLedger(caseId),enabled:Boolean(caseId),retry:false}); const create=useMutation({mutationFn:()=>createFeeAgreement(caseId,Math.round(Number(amount)*100)),onSuccess:()=>cache.invalidateQueries({queryKey:["fees",caseId]})}); return <Screen><Title>Fee ledger</Title>{ledger.data?<><Text>Agreed: {money(ledger.data.agreement.agreed_amount_paise)}</Text><Text>Collected: {money(ledger.data.collected_paise)}</Text><Text>Outstanding: {money(ledger.data.outstanding_paise)}</Text></>:<><Muted>Create an INR fee agreement.</Muted><Field label="Agreed fee ₹" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="25000"/><Button loading={create.isPending} disabled={Number(amount)<=0} onPress={()=>create.mutate()}>Create agreement</Button>{create.error&&<Text style={{color:"#dc2626"}}>{create.error.message}</Text>}</>}</Screen>}
