import type { Entity } from "@emulators/core";

export interface ASCApp extends Entity {
  asc_id: string;
  name: string;
  bundle_id: string;
  primary_locale: string | null;
}

export interface ASCBuild extends Entity {
  asc_id: string;
  app_id: string;
  version: string;
  processing_state: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
  is_expired: boolean;
}

export interface ASCVersion extends Entity {
  asc_id: string;
  app_id: string;
  version_string: string;
  platform: "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";
  app_store_state: string;
}

export type ReviewSubmissionState =
  | "READY_FOR_REVIEW"
  | "WAITING_FOR_REVIEW"
  | "IN_REVIEW"
  | "UNRESOLVED_ISSUES"
  | "CANCELING"
  | "COMPLETING"
  | "COMPLETE";

export interface ASCReviewSubmission extends Entity {
  asc_id: string;
  app_id: string;
  platform: string;
  state: ReviewSubmissionState;
  submitted_date: string | null;
  resolved_date: string | null;
  rejection_reasons: string[] | null;
  reviewer_notes: string | null;
}

export type ReviewScenario = "approve" | "reject" | "timeout";

export interface ASCLocalization extends Entity {
  asc_id: string;
  version_id: string;
  locale: string;
  description: string | null;
  keywords: string | null;
  marketing_url: string | null;
  promotional_text: string | null;
  support_url: string | null;
  whats_new: string | null;
}
