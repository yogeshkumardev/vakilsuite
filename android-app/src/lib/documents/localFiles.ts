import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import ReactNativeBlobUtil from "react-native-blob-util";

export async function saveLocally(uri: string, name: string, mime = "application/pdf") {
  const info = await FS.getInfoAsync(uri);
  if (!info.exists) throw new Error("Local file is missing. Open the server copy and retry.");
  if (Platform.OS === "android" && Number(Platform.Version) >= 29) {
    await ReactNativeBlobUtil.MediaCollection.copyToMediaStore({ name: name.replace(/[/\\]/g, "_"), parentFolder: "VakilSuite", mimeType: mime }, "Download", uri.replace(/^file:\/\//, ""));
    return "Saved to Downloads/VakilSuite.";
  }
  await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: "Save a copy" });
  return "Use the share menu to save a copy.";
}
