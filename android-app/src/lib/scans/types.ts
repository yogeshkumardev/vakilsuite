export interface ScanPage { uri: string; width: number; height: number; originalIndex: number }
export type ScanStatus = "draft" | "queued" | "uploading" | "failed" | "quarantined" | "uploaded" | "paused";
export type CaptureSource = "android_scan" | "android_import";
export type Quality = "original" | "balanced" | "compact";
export interface SavedScan {
  id: string;
  ownerId: string;
  chamberId: string;
  caseId: string;
  fileName: string;
  uri: string;
  pages: ScanPage[];
  pageCount: number;
  fileSize: number;
  quality: Quality;
  captureSource: CaptureSource;
  /** Reserved for S04 annexure selection; survives retries and app restarts. */
  annexureId: string | null;
  status: ScanStatus;
  documentId: string | null;
  transferComplete: boolean;
  attempts: number;
  nextAttempt: number;
  error: string | null;
  lastAttemptAt: number | null;
  createdAt: number;
  localDeleted: boolean;
}
