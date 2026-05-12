import type { RouteContext, Store } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";

interface CustomerReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_nickname: string | null;
  territory: string | null;
  created_date: string | null;
}

interface ReviewResponse {
  id: string;
  review_id: string;
  response_body: string;
  state: "PENDING_PUBLISH" | "PUBLISHED";
  last_modified_date: string;
}

function getReviews(store: Store): CustomerReview[] {
  return store.getData<CustomerReview[]>("asc.customer_reviews") ?? [];
}

function getResponses(store: Store): ReviewResponse[] {
  return store.getData<ReviewResponse[]>("asc.review_responses") ?? [];
}

function setResponses(store: Store, responses: ReviewResponse[]): void {
  store.setData("asc.review_responses", responses);
}

export function reviewRoutes({ app, store, baseUrl }: RouteContext): void {
  // List customer reviews for an app
  app.get("/v1/apps/:appId/customerReviews", (c) => {
    const reviews = getReviews(store);
    const ratingFilter = c.req.query("filter[rating]");
    const { cursor, limit } = parseCursor(c);

    let filtered = reviews;
    if (ratingFilter) {
      const rating = parseInt(ratingFilter, 10);
      filtered = reviews.filter((r) => r.rating === rating);
    }

    const page = filtered.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "customerReviews",
        page.map((r) => ({
          id: r.id,
          attributes: {
            rating: r.rating,
            title: r.title,
            body: r.body,
            reviewerNickname: r.reviewer_nickname,
            territory: r.territory,
            createdDate: r.created_date,
          },
        })),
        cursor,
        limit,
        filtered.length,
      ),
    );
  });

  // Get single customer review
  app.get("/v1/customerReviews/:id", (c) => {
    const id = c.req.param("id");
    const reviews = getReviews(store);
    const review = reviews.find((r) => r.id === id);
    if (!review) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `CustomerReview ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "customerReviews", review.id, {
        rating: review.rating,
        title: review.title,
        body: review.body,
        reviewerNickname: review.reviewer_nickname,
        territory: review.territory,
        createdDate: review.created_date,
      }),
    );
  });

  // Create review response
  app.post("/v1/customerReviewResponses", async (c) => {
    const body = await parseJsonApiBody(c);
    const responseBody = body.attributes.responseBody as string;
    const reviewRel = body.relationships?.review;
    const reviewId = reviewRel?.data?.id ?? "";

    if (!responseBody || !reviewId) {
      return c.json(jsonApiError(422, "INVALID_INPUT", "Invalid Input", "Missing responseBody or review relationship"), 422);
    }

    const response: ReviewResponse = {
      id: ascId(),
      review_id: reviewId,
      response_body: responseBody,
      state: "PUBLISHED",
      last_modified_date: new Date().toISOString(),
    };

    const responses = getResponses(store);
    responses.push(response);
    setResponses(store, responses);

    return c.json(
      jsonApiResource(baseUrl, "customerReviewResponses", response.id, {
        responseBody: response.response_body,
        state: response.state,
        lastModifiedDate: response.last_modified_date,
      }),
      201,
    );
  });

  // Delete review response
  app.delete("/v1/customerReviewResponses/:id", (c) => {
    const id = c.req.param("id");
    const responses = getResponses(store);
    const idx = responses.findIndex((r) => r.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewResponse ${id} not found`), 404);
    }
    responses.splice(idx, 1);
    setResponses(store, responses);
    return c.body(null, 204);
  });
}
