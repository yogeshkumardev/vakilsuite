export type DictationTransport = "native" | "browser" | "bridge-unavailable";

export function resolveDictationTransport(
    hasNativeBridge: boolean,
    embedded: boolean,
): DictationTransport {
    if (hasNativeBridge) return "native";
    return embedded ? "bridge-unavailable" : "browser";
}
