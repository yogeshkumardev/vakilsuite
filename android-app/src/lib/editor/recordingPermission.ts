type Permission = { granted: boolean; canAskAgain: boolean };
interface Dependencies {
  check: () => Promise<Permission>;
  request: () => Promise<Permission>;
  currentState: () => string | null;
}

/** Only an in-flight OS permission prompt may temporarily suspend cancellation.
 * Never allow microphone/network startup until the app is active again.
 */
export class RecordingPermissionGate {
  private prompting = false;
  private finishWait: ((error?: Error) => void) | null = null;

  constructor(private readonly dependencies: Dependencies) {}

  /** Returns whether the controller must cancel for this lifecycle event. */
  onAppState(next: string): boolean {
    if (next === "active") this.finishWait?.();
    return next !== "active" && !this.prompting;
  }

  cancelWait() {
    this.finishWait?.(new Error("Dictation was cancelled."));
  }

  private async waitUntilActive(isCurrent: () => boolean) {
    if (!isCurrent()) throw new Error("Dictation was cancelled.");
    if (this.dependencies.currentState() === "active") return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("Return to the app and tap Dictate again.")), 5000);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.finishWait = null;
        if (error) reject(error);
        else resolve();
      };
      this.finishWait = finish;
    });
    if (!isCurrent() || this.dependencies.currentState() !== "active") {
      throw new Error("Return to the app and tap Dictate again.");
    }
  }

  async prepare(isCurrent: () => boolean): Promise<void> {
    let permission = await this.dependencies.check();
    if (!isCurrent()) throw new Error("Dictation was cancelled.");
    try {
      if (!permission.granted && permission.canAskAgain) {
        // Set this before requesting: GrantPermissionsActivity can pause Android.
        this.prompting = true;
        permission = await this.dependencies.request();
      }
      if (!permission.granted) throw new Error(permission.canAskAgain
        ? "Microphone permission is required for dictation."
        : "Microphone permission is blocked. Enable it in Android settings.");
      // Permission resolution and Activity resume are separate native events.
      await this.waitUntilActive(isCurrent);
    } finally {
      this.prompting = false;
    }
  }
}
