import { Store, type Collection } from "@api-emulator/core";
import type {
  ASCApp,
  ASCBuild,
  ASCVersion,
  ASCReviewSubmission,
  ASCLocalization,
} from "./entities.js";

export interface ASCStore {
  apps: Collection<ASCApp>;
  builds: Collection<ASCBuild>;
  versions: Collection<ASCVersion>;
  reviewSubmissions: Collection<ASCReviewSubmission>;
  localizations: Collection<ASCLocalization>;
}

export function getASCStore(store: Store): ASCStore {
  return {
    apps: store.collection<ASCApp>("asc.apps", ["asc_id", "bundle_id"]),
    builds: store.collection<ASCBuild>("asc.builds", ["asc_id", "app_id"]),
    versions: store.collection<ASCVersion>("asc.versions", ["asc_id", "app_id"]),
    reviewSubmissions: store.collection<ASCReviewSubmission>("asc.review_submissions", ["asc_id", "app_id"]),
    localizations: store.collection<ASCLocalization>("asc.localizations", ["asc_id", "version_id"]),
  };
}
