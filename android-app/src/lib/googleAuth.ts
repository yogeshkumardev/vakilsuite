import { loginWithGoogle } from "@/lib/api/auth";

// Load on demand so an older development APK still opens after a JS update.
export async function signInWithGoogle() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error("Google login is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and restart Metro.");
  let sdk: typeof import("@react-native-google-signin/google-signin");
  try {
    sdk = await import("@react-native-google-signin/google-signin");
  } catch {
    throw new Error("Google login needs the updated Android build. Rebuild and install the APK.");
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = sdk;
  let token: string | null = null;
  try {
    GoogleSignin.configure({ webClientId, offlineAccess: false });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // App sessions are managed by our backend; always offer account selection.
    await GoogleSignin.signOut();
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) return;
    token = result.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error("Update Google Play services on your phone, then try again.");
      if (error.code === statusCodes.IN_PROGRESS) throw new Error("Google sign-in is already in progress.");
      if (error.code === "10" || error.message.includes("DEVELOPER_ERROR")) throw new Error("Google Android configuration is incomplete. Check the package name, signing SHA-1 and Web client ID.");
    }
    throw new Error("Could not connect to Google. Please try again.");
  }
  if (!token) throw new Error("Google did not return an ID token. Check the Web client ID configuration.");
  return loginWithGoogle(token);
}
