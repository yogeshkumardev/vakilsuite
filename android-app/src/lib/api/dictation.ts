import { File } from "expo-file-system";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/types/generated-api";

export type DictationLanguage = components["schemas"]["DictationLanguage"];
export type DictationMode = components["schemas"]["DictationMode"];
export type DictationTranscription = components["schemas"]["DictationTranscription"];

export async function transcribeNativeDictation(input: {
  uri: string;
  languageCode: DictationLanguage;
  mode: DictationMode;
  clientRequestId: string;
}): Promise<DictationTranscription> {
  const audio = new File(input.uri);
  if (!audio.exists || audio.size === 0) {
    throw new Error("The recording could not be saved. Please record again.");
  }

  const form = new FormData();
  // Expo 57's global fetch expects a real Blob/File, not React Native's old
  // { uri, name, type } multipart shim.
  form.append("audio", audio, "dictation.m4a");
  form.append("language_code", input.languageCode);
  form.append("mode", input.mode);
  form.append("client_request_id", input.clientRequestId);
  return apiClient.postForm<DictationTranscription>("/dictation/transcriptions", form);
}
