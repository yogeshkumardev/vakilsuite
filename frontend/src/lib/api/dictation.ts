import type { components } from "@/types/generated-api";
import type { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

export type DictationLanguage = components["schemas"]["DictationLanguage"];
export type DictationMode = components["schemas"]["DictationMode"];
export type DictationTranscription = components["schemas"]["DictationTranscription"];

export interface TranscribeDictationInput {
    audio: Blob;
    fileName: string;
    languageCode: DictationLanguage;
    mode?: DictationMode;
    clientRequestId: string;
}

export async function transcribeDictation(
    input: TranscribeDictationInput,
): Promise<DictationTranscription> {
    const body = new FormData();
    body.append("audio", input.audio, input.fileName);
    body.append("language_code", input.languageCode);
    body.append("mode", input.mode ?? "codemix");
    body.append("client_request_id", input.clientRequestId);
    const response = await apiClient.postForm<ApiResponse<DictationTranscription>>(
        "/dictation/transcriptions",
        body,
    );
    if (!response.success) throw new Error(response.error.message);
    return response.data;
}
