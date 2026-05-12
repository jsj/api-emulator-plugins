import type { RouteContext } from "@emulators/core";
import { getASCStore } from "../store.js";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";
import type { ReviewScenario, ReviewSubmissionState } from "../entities.js";

function getScenario(store: RouteContext["store"]): ReviewScenario {
  return store.getData<ReviewScenario>("asc.review_scenario") ?? "approve";
}

function getRejectionReasons(store: RouteContext["store"]): string[] {
  return store.getData<string[]>("asc.rejection_reasons") ?? ["METADATA_REJECTED"];
}

function getReviewerNotes(store: RouteContext["store"]): string | null {
  return store.getData<string | null>("asc.reviewer_notes") ?? null;
}

function formatSubmission(sub: { asc_id: string; platform: string; state: ReviewSubmissionState; submitted_date: string | null; resolved_date: string | null; rejection_reasons: string[] | null; reviewer_notes: string | null }) {
  return {
    id: sub.asc_id,
    attributes: {
      platform: sub.platform,
      state: sub.state,
      submittedDate: sub.submitted_date,
      ...(sub.resolved_date ? { resolvedDate: sub.resolved_date } : {}),
      ...(sub.rejection_reasons ? { rejectionReasons: sub.rejection_reasons } : {}),
      ...(sub.reviewer_notes ? { reviewerNotes: sub.reviewer_notes } : {}),
    },
  };
}

export function reviewSubmissionRoutes({ app, store, baseUrl }: RouteContext): void {
  const asc = getASCStore(store);

  // List review submissions (filtered by app)
  app.get("/v1/reviewSubmissions", (c) => {
    const appFilter = c.req.query("filter[app]") ?? "";
    const { cursor, limit } = parseCursor(c);

    let all = asc.reviewSubmissions.all();
    if (appFilter) {
      all = all.filter((s) => s.app_id === appFilter);
    }
    const total = all.length;
    const page = all.slice(cursor, cursor + limit);

    return c.json(
      jsonApiList(
        baseUrl,
        "reviewSubmissions",
        page.map(formatSubmission),
        cursor,
        limit,
        total,
      ),
    );
  });

  // Get single review submission
  app.get("/v1/reviewSubmissions/:id", (c) => {
    const id = c.req.param("id");
    const sub = asc.reviewSubmissions.findOneBy("asc_id", id);
    if (!sub) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmission ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", sub.asc_id, formatSubmission(sub).attributes));
  });

  // Create review submission
  app.post("/v1/reviewSubmissions", async (c) => {
    const body = await parseJsonApiBody(c);
    const platform = (body.attributes.platform as string) ?? "IOS";
    const appRel = body.relationships?.app;
    const appId = appRel?.data?.id ?? "";

    if (!appId) {
      return c.json(jsonApiError(422, "INVALID_INPUT", "Invalid Input", "Missing app relationship"), 422);
    }

    const sub = asc.reviewSubmissions.insert({
      asc_id: ascId(),
      app_id: appId,
      platform,
      state: "READY_FOR_REVIEW",
      submitted_date: null,
      resolved_date: null,
      rejection_reasons: null,
      reviewer_notes: null,
    });

    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", sub.asc_id, formatSubmission(sub).attributes), 201);
  });

  // Submit for review (PATCH to transition state)
  app.patch("/v1/reviewSubmissions/:id", async (c) => {
    const id = c.req.param("id");
    const sub = asc.reviewSubmissions.findOneBy("asc_id", id);
    if (!sub) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmission ${id} not found`), 404);
    }

    const body = await parseJsonApiBody(c);
    const requestedState = body.attributes.state as string | undefined;

    // If the client is requesting WAITING_FOR_REVIEW, that's a submit action
    if (requestedState === "WAITING_FOR_REVIEW") {
      if (sub.state !== "READY_FOR_REVIEW" && sub.state !== "UNRESOLVED_ISSUES") {
        return c.json(
          jsonApiError(409, "CONFLICT", "Invalid State Transition", `Cannot submit from state: ${sub.state}`),
          409,
        );
      }

      const now = new Date().toISOString();
      const scenario = getScenario(store);

      let newState: ReviewSubmissionState;
      let resolvedDate: string | null = null;
      let rejectionReasons: string[] | null = null;
      let reviewerNotes: string | null = null;

      switch (scenario) {
        case "approve":
          newState = "COMPLETE";
          resolvedDate = now;
          break;
        case "reject":
          newState = "UNRESOLVED_ISSUES";
          rejectionReasons = getRejectionReasons(store);
          reviewerNotes = getReviewerNotes(store);
          break;
        case "timeout":
          newState = "IN_REVIEW";
          break;
      }

      const updated = asc.reviewSubmissions.update(sub.id, {
        state: newState,
        submitted_date: now,
        resolved_date: resolvedDate,
        rejection_reasons: rejectionReasons,
        reviewer_notes: reviewerNotes,
      });

      if (!updated) {
        return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
      }

      return c.json(jsonApiResource(baseUrl, "reviewSubmissions", updated.asc_id, formatSubmission(updated).attributes));
    }

    // Generic attribute update
    const updates: Record<string, unknown> = {};
    if (body.attributes.platform) updates.platform = body.attributes.platform;
    const updated = asc.reviewSubmissions.update(sub.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", updated.asc_id, formatSubmission(updated).attributes));
  });

  // Cancel review submission
  app.delete("/v1/reviewSubmissions/:id", (c) => {
    const id = c.req.param("id");
    const sub = asc.reviewSubmissions.findOneBy("asc_id", id);
    if (!sub) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmission ${id} not found`), 404);
    }
    asc.reviewSubmissions.delete(sub.id);
    return c.body(null, 204);
  });
}
