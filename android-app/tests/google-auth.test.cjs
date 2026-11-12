const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, imports, env = {}) {
  const exports = {};
  const source = fs.readFileSync(`${__dirname}/../src/lib/${file}.ts`, "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(outputText, { exports, process: { env }, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected module ${name}`);
    return imports[name];
  } });
  return exports;
}

test("Google exchange sends Android metadata and persists backend session", async () => {
  let request, saved, auth;
  const tokens = { user: { id: "u" }, access_token: "access", refresh_token: "refresh", session_id: "session" };
  const api = load("api/auth", {
    "@/lib/api/client": { waitForRefresh: async () => {}, apiClient: { post: async (...args) => { request = args; return tokens; } } },
    "@/lib/storage/secureTokens": { getOrCreateDeviceId: async () => "phone", saveSessionTokens: async (...args) => { saved = args; } },
    "@/store/auth.store": { useAuthStore: { getState: () => ({ setAuth: (...args) => { auth = args; } }) } },
  });
  await api.loginWithGoogle("google-token");
  assert.equal(request[0], "/auth/login/google");
  assert.equal(request[1].id_token, "google-token");
  assert.equal(request[1].device_type, "android");
  assert.equal(request[1].device_id, "phone");
  assert.equal("email" in request[1], false);
  assert.equal(request[2].noAuth, true);
  assert.deepEqual(saved, ["refresh", "session"]);
  assert.deepEqual(auth, [tokens.user, "access"]);
});

for (const outcome of ["success", "cancelled", "missing-token", "developer-error"]) {
  test(`native Google sign-in: ${outcome}`, async () => {
    let exchanged, configured;
    const sdk = {
      GoogleSignin: {
        configure: options => { configured = options; }, hasPlayServices: async () => {}, signOut: async () => {},
        signIn: async () => {
          if (outcome === "developer-error") throw { code: "10", message: "DEVELOPER_ERROR" };
          return { type: outcome === "cancelled" ? "cancelled" : "success", data: { idToken: outcome === "missing-token" ? null : "token" } };
        },
      },
      isSuccessResponse: result => result.type === "success", isErrorWithCode: error => !!error.code, statusCodes: {},
    };
    const { signInWithGoogle } = load("googleAuth", {
      "@/lib/api/auth": { loginWithGoogle: async token => { exchanged = token; } },
      "@react-native-google-signin/google-signin": sdk,
    }, { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client" });
    if (outcome === "missing-token") await assert.rejects(signInWithGoogle(), /ID token/);
    else if (outcome === "developer-error") await assert.rejects(signInWithGoogle(), /SHA-1/);
    else await signInWithGoogle();
    assert.equal(configured.webClientId, "web-client");
    assert.equal(exchanged, outcome === "success" ? "token" : undefined);
  });
}
