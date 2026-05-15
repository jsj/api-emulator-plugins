import type { RouteContext, Store } from "@api-emulator/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";

interface ReviewSubmissionItem {
  id: string;
  submission_id: string;
  state: string;
  app_store_version_id: string;
}

interface ReviewAttachment {
  id: string;
  review_detail_id: string;
  file_name: string;
  file_size: number;
}

function getItems(store: Store): ReviewSubmissionItem[] {
  return store.getData<ReviewSubmissionItem[]>("asc.review_submission_items") ?? [];
}

function setItems(store: Store, items: ReviewSubmissionItem[]): void {
  store.setData("asc.review_submission_items", items);
}

function getAttachments(store: Store): ReviewAttachment[] {
  return store.getData<ReviewAttachment[]>("asc.review_attachments") ?? [];
}

function setAttachments(store: Store, attachments: ReviewAttachment[]): void {
  store.setData("asc.review_attachments", attachments);
}

export function reviewItemRoutes({ app, store, baseUrl }: RouteContext): void {
  // List review submission items
  app.get("/v1/reviewSubmissions/:submissionId/items", (c) => {
    const submissionId = c.req.param("submissionId");
    const items = getItems(store).filter((i) => i.submission_id === submissionId);
    return c.json(
      jsonApiList(
        baseUrl,
        "reviewSubmissionItems",
        items.map((i) => ({
          id: i.id,
          attributes: { state: i.state, appStoreVersionId: i.app_store_version_id },
        })),
        0,
        50,
        items.length,
      ),
    );
  });

  // Create review submission item
  app.post("/v1/reviewSubmissionItems", async (c) => {
    const body = await parseJsonApiBody(c);
    const submissionRel = body.relationships?.reviewSubmission;
    const submissionId = submissionRel?.data?.id ?? "";
    const versionRel = body.relationships?.appStoreVersion;
    const versionId = versionRel?.data?.id ?? "";

    const item: ReviewSubmissionItem = {
      id: ascId(),
      submission_id: submissionId,
      state: "READY_FOR_REVIEW",
      app_store_version_id: versionId,
    };
    const items = getItems(store);
    items.push(item);
    setItems(store, items);

    return c.json(
      jsonApiResource(baseUrl, "reviewSubmissionItems", item.id, {
        state: item.state,
        appStoreVersionId: item.app_store_version_id,
      }),
      201,
    );
  });

  // Delete review submission item
  app.delete("/v1/reviewSubmissionItems/:id", (c) => {
    const id = c.req.param("id");
    const items = getItems(store);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmissionItem ${id} not found`), 404);
    }
    items.splice(idx, 1);
    setItems(store, items);
    return c.body(null, 204);
  });

  // List review attachments
  app.get("/v1/appStoreReviewDetails/:detailId/appStoreReviewAttachments", (c) => {
    const detailId = c.req.param("detailId");
    const attachments = getAttachments(store).filter((a) => a.review_detail_id === detailId);
    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreReviewAttachments",
        attachments.map((a) => ({
          id: a.id,
          attributes: { fileName: a.file_name, fileSize: a.file_size },
        })),
        0,
        50,
        attachments.length,
      ),
    );
  });

  // Create review attachment
  app.post("/v1/appStoreReviewAttachments", async (c) => {
    const body = await parseJsonApiBody(c);
    const detailRel = body.relationships?.appStoreReviewDetail;
    const detailId = detailRel?.data?.id ?? "";
    const fileName = (body.attributes.fileName as string) ?? "attachment.png";
    const fileSize = (body.attributes.fileSize as number) ?? 0;

    const attachment: ReviewAttachment = {
      id: ascId(),
      review_detail_id: detailId,
      file_name: fileName,
      file_size: fileSize,
    };
    const attachments = getAttachments(store);
    attachments.push(attachment);
    setAttachments(store, attachments);

    return c.json(
      jsonApiResource(baseUrl, "appStoreReviewAttachments", attachment.id, {
        fileName: attachment.file_name,
        fileSize: attachment.file_size,
      }),
      201,
    );
  });

  // Delete review attachment
  app.delete("/v1/appStoreReviewAttachments/:id", (c) => {
    const id = c.req.param("id");
    const attachments = getAttachments(store);
    const idx = attachments.findIndex((a) => a.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewAttachment ${id} not found`), 404);
    }
    attachments.splice(idx, 1);
    setAttachments(store, attachments);
    return c.body(null, 204);
  });
}
