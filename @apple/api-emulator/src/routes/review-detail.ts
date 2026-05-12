import type { RouteContext, Store } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiError, parseJsonApiBody } from "../jsonapi.js";

interface ReviewDetail {
  id: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  demo_account_name: string | null;
  demo_account_password: string | null;
  is_demo_account_required: boolean;
  notes: string | null;
}

function getDetails(store: Store): Map<string, ReviewDetail> {
  let map = store.getData<Map<string, ReviewDetail>>("asc.review_details");
  if (!map) {
    map = new Map();
    store.setData("asc.review_details", map);
  }
  return map;
}

export function reviewDetailRoutes({ app, store, baseUrl }: RouteContext): void {
  // Get review detail for a version
  app.get("/v1/appStoreVersions/:versionId/appStoreReviewDetail", (c) => {
    const versionId = c.req.param("versionId");
    const details = getDetails(store);
    const detail = details.get(versionId) ?? {
      id: `review-detail-${versionId}`,
      contact_first_name: null,
      contact_last_name: null,
      contact_phone: null,
      contact_email: null,
      demo_account_name: null,
      demo_account_password: null,
      is_demo_account_required: false,
      notes: null,
    };

    if (!details.has(versionId)) {
      details.set(versionId, detail);
    }

    return c.json(
      jsonApiResource(baseUrl, "appStoreReviewDetails", detail.id, {
        contactFirstName: detail.contact_first_name,
        contactLastName: detail.contact_last_name,
        contactPhone: detail.contact_phone,
        contactEmail: detail.contact_email,
        demoAccountName: detail.demo_account_name,
        demoAccountPassword: detail.demo_account_password,
        demoAccountRequired: detail.is_demo_account_required,
        notes: detail.notes,
      }),
    );
  });

  // Update review detail
  app.patch("/v1/appStoreReviewDetails/:id", async (c) => {
    const id = c.req.param("id");
    const body = await parseJsonApiBody(c);

    const detail: ReviewDetail = {
      id,
      contact_first_name: (body.attributes.contactFirstName as string) ?? null,
      contact_last_name: (body.attributes.contactLastName as string) ?? null,
      contact_phone: (body.attributes.contactPhone as string) ?? null,
      contact_email: (body.attributes.contactEmail as string) ?? null,
      demo_account_name: (body.attributes.demoAccountName as string) ?? null,
      demo_account_password: (body.attributes.demoAccountPassword as string) ?? null,
      is_demo_account_required: (body.attributes.demoAccountRequired as boolean) ?? false,
      notes: (body.attributes.notes as string) ?? null,
    };

    // Store by ID (we don't know the versionId here, so store by detail ID)
    const details = getDetails(store);
    details.set(id, detail);

    return c.json(
      jsonApiResource(baseUrl, "appStoreReviewDetails", detail.id, {
        contactFirstName: detail.contact_first_name,
        contactLastName: detail.contact_last_name,
        contactPhone: detail.contact_phone,
        contactEmail: detail.contact_email,
        demoAccountName: detail.demo_account_name,
        demoAccountPassword: detail.demo_account_password,
        demoAccountRequired: detail.is_demo_account_required,
        notes: detail.notes,
      }),
    );
  });
}
