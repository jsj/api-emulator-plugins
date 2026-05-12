// ../api-emulator-plugins/@apple/api-emulator/src/store.ts
function getASCStore(store) {
  return {
    apps: store.collection("asc.apps", ["asc_id", "bundle_id"]),
    builds: store.collection("asc.builds", ["asc_id", "app_id"]),
    versions: store.collection("asc.versions", ["asc_id", "app_id"]),
    reviewSubmissions: store.collection("asc.review_submissions", ["asc_id", "app_id"]),
    localizations: store.collection("asc.localizations", ["asc_id", "version_id"])
  };
}

// ../api-emulator-plugins/@apple/api-emulator/src/jsonapi.ts
import { randomBytes } from "crypto";
function ascId() {
  return randomBytes(8).toString("hex");
}
function jsonApiResource(baseUrl, type, id, attributes, relationships) {
  const self = `${baseUrl}/v1/${type}/${id}`;
  return {
    data: {
      type,
      id,
      attributes,
      ...relationships ? { relationships } : {},
      links: { self }
    },
    links: { self }
  };
}
function jsonApiList(baseUrl, type, items, cursor, limit, total) {
  const self = `${baseUrl}/v1/${type}?limit=${limit}`;
  const hasNext = cursor + limit < total;
  return {
    data: items.map((item) => ({
      type,
      id: item.id,
      attributes: item.attributes,
      links: { self: `${baseUrl}/v1/${type}/${item.id}` }
    })),
    links: {
      self,
      ...hasNext ? { next: `${baseUrl}/v1/${type}?cursor=${cursor + limit}&limit=${limit}` } : {}
    },
    meta: {
      paging: { total, limit }
    }
  };
}
function jsonApiError(status, code, title, detail) {
  return {
    errors: [{ status: String(status), code, title, detail }]
  };
}
function parseCursor(c) {
  const cursor = Math.max(0, parseInt(c.req.query("cursor") ?? "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query("limit") ?? "50", 10) || 50));
  return { cursor, limit };
}
async function parseJsonApiBody(c) {
  const json = await c.req.json();
  const data = json?.data;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON:API request body");
  }
  return {
    type: data.type ?? "",
    attributes: data.attributes ?? {},
    relationships: data.relationships ?? {}
  };
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/review-submissions.ts
function getScenario(store) {
  return store.getData("asc.review_scenario") ?? "approve";
}
function getRejectionReasons(store) {
  return store.getData("asc.rejection_reasons") ?? ["METADATA_REJECTED"];
}
function getReviewerNotes(store) {
  return store.getData("asc.reviewer_notes") ?? null;
}
function formatSubmission(sub) {
  return {
    id: sub.asc_id,
    attributes: {
      platform: sub.platform,
      state: sub.state,
      submittedDate: sub.submitted_date,
      ...sub.resolved_date ? { resolvedDate: sub.resolved_date } : {},
      ...sub.rejection_reasons ? { rejectionReasons: sub.rejection_reasons } : {},
      ...sub.reviewer_notes ? { reviewerNotes: sub.reviewer_notes } : {}
    }
  };
}
function reviewSubmissionRoutes({ app, store, baseUrl }) {
  const asc = getASCStore(store);
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
        total
      )
    );
  });
  app.get("/v1/reviewSubmissions/:id", (c) => {
    const id = c.req.param("id");
    const sub = asc.reviewSubmissions.findOneBy("asc_id", id);
    if (!sub) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmission ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", sub.asc_id, formatSubmission(sub).attributes));
  });
  app.post("/v1/reviewSubmissions", async (c) => {
    const body = await parseJsonApiBody(c);
    const platform = body.attributes.platform ?? "IOS";
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
      reviewer_notes: null
    });
    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", sub.asc_id, formatSubmission(sub).attributes), 201);
  });
  app.patch("/v1/reviewSubmissions/:id", async (c) => {
    const id = c.req.param("id");
    const sub = asc.reviewSubmissions.findOneBy("asc_id", id);
    if (!sub) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `ReviewSubmission ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    const requestedState = body.attributes.state;
    if (requestedState === "WAITING_FOR_REVIEW") {
      if (sub.state !== "READY_FOR_REVIEW" && sub.state !== "UNRESOLVED_ISSUES") {
        return c.json(
          jsonApiError(409, "CONFLICT", "Invalid State Transition", `Cannot submit from state: ${sub.state}`),
          409
        );
      }
      const now3 = (/* @__PURE__ */ new Date()).toISOString();
      const scenario = getScenario(store);
      let newState;
      let resolvedDate = null;
      let rejectionReasons = null;
      let reviewerNotes = null;
      switch (scenario) {
        case "approve":
          newState = "COMPLETE";
          resolvedDate = now3;
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
      const updated2 = asc.reviewSubmissions.update(sub.id, {
        state: newState,
        submitted_date: now3,
        resolved_date: resolvedDate,
        rejection_reasons: rejectionReasons,
        reviewer_notes: reviewerNotes
      });
      if (!updated2) {
        return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
      }
      return c.json(jsonApiResource(baseUrl, "reviewSubmissions", updated2.asc_id, formatSubmission(updated2).attributes));
    }
    const updates = {};
    if (body.attributes.platform) updates.platform = body.attributes.platform;
    const updated = asc.reviewSubmissions.update(sub.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(jsonApiResource(baseUrl, "reviewSubmissions", updated.asc_id, formatSubmission(updated).attributes));
  });
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

// ../api-emulator-plugins/@apple/api-emulator/src/routes/auth.ts
function getUsers(store) {
  return store.getData("asc.users") ?? [];
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function fakeSignedHeaders(body = {}) {
  const request = body.request ?? {};
  return {
    headers: {
      "X-Apple-MD": "fake-md",
      "X-Apple-MD-M": "fake-md-m",
      "X-Apple-MD-RINFO": "17106176",
      "X-Apple-MD-LU": "fake-lu",
      "X-VPhone-Apple-Emulator": "1"
    },
    mescalSignature: "fake-mescal-signature",
    request: {
      url: typeof request.url === "string" ? request.url : null,
      method: typeof request.method === "string" ? request.method : null
    },
    issuedAt: now()
  };
}
function authRoutes({ app, store, baseUrl }) {
  app.get("/bag.xml", (c) => c.json({
    status: 0,
    bag: {
      profile: "AMSCore",
      profileVersion: "1",
      environment: "emulator"
    },
    issuedAt: now()
  }));
  app.post("/v1/signSapSetup", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const response = fakeSignedHeaders(body);
    store.setData("apple:last-sign-sap-setup", body);
    store.setData("apple:last-sign-sap-setup-response", response);
    return c.json(response);
  });
  app.post("/auth/signin", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    store.setData("apple:last-signin", body);
    return c.json({
      ok: true,
      user: {
        id: "apple-emulator-user",
        email: "demo@apple-emulator.local"
      },
      token: "apple-emulator-token",
      issuedAt: now()
    });
  });
  app.get("/v1/users", (c) => {
    const users = getUsers(store);
    const { cursor, limit } = parseCursor(c);
    const page = users.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "users",
        page.map((u) => ({
          id: u.id,
          attributes: {
            username: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            roles: u.roles
          }
        })),
        cursor,
        limit,
        users.length
      )
    );
  });
  app.get("/v1/users/:id", (c) => {
    const id = c.req.param("id");
    const users = getUsers(store);
    const user = users.find((u) => u.id === id);
    if (!user) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `User ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "users", user.id, {
        username: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        roles: user.roles
      })
    );
  });
  app.get("/v1/ciProducts/:productId/additionalRepositories", (_c) => {
    return _c.json({ data: [], links: { self: `${baseUrl}/v1/ciProducts` }, meta: { paging: { total: 0, limit: 50 } } });
  });
  app.get("/v1/userInvitations", (c) => {
    return c.json(jsonApiList(baseUrl, "userInvitations", [], 0, 50, 0));
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/reviews.ts
function getReviews(store) {
  return store.getData("asc.customer_reviews") ?? [];
}
function getResponses(store) {
  return store.getData("asc.review_responses") ?? [];
}
function setResponses(store, responses) {
  store.setData("asc.review_responses", responses);
}
function reviewRoutes({ app, store, baseUrl }) {
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
            createdDate: r.created_date
          }
        })),
        cursor,
        limit,
        filtered.length
      )
    );
  });
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
        createdDate: review.created_date
      })
    );
  });
  app.post("/v1/customerReviewResponses", async (c) => {
    const body = await parseJsonApiBody(c);
    const responseBody = body.attributes.responseBody;
    const reviewRel = body.relationships?.review;
    const reviewId = reviewRel?.data?.id ?? "";
    if (!responseBody || !reviewId) {
      return c.json(jsonApiError(422, "INVALID_INPUT", "Invalid Input", "Missing responseBody or review relationship"), 422);
    }
    const response = {
      id: ascId(),
      review_id: reviewId,
      response_body: responseBody,
      state: "PUBLISHED",
      last_modified_date: (/* @__PURE__ */ new Date()).toISOString()
    };
    const responses = getResponses(store);
    responses.push(response);
    setResponses(store, responses);
    return c.json(
      jsonApiResource(baseUrl, "customerReviewResponses", response.id, {
        responseBody: response.response_body,
        state: response.state,
        lastModifiedDate: response.last_modified_date
      }),
      201
    );
  });
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

// ../api-emulator-plugins/@apple/api-emulator/src/routes/xcode-cloud.ts
function getProducts(store) {
  return store.getData("asc.ci_products") ?? [];
}
function getWorkflows(store) {
  return store.getData("asc.ci_workflows") ?? [];
}
function getBuildRuns(store) {
  return store.getData("asc.ci_build_runs") ?? [];
}
function setBuildRuns(store, runs) {
  store.setData("asc.ci_build_runs", runs);
}
function xcodeCloudRoutes({ app, store, baseUrl }) {
  app.get("/v1/ciProducts", (c) => {
    const products = getProducts(store);
    const { cursor, limit } = parseCursor(c);
    const page = products.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "ciProducts",
        page.map((p) => ({
          id: p.id,
          attributes: { name: p.name, productType: p.product_type }
        })),
        cursor,
        limit,
        products.length
      )
    );
  });
  app.get("/v1/ciProducts/:id", (c) => {
    const id = c.req.param("id");
    const product = getProducts(store).find((p) => p.id === id);
    if (!product) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `CiProduct ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, "ciProducts", product.id, { name: product.name, productType: product.product_type }));
  });
  app.get("/v1/ciProducts/:productId/workflows", (c) => {
    const productId = c.req.param("productId");
    const workflows = getWorkflows(store).filter((w) => w.product_id === productId);
    const { cursor, limit } = parseCursor(c);
    const page = workflows.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "ciWorkflows",
        page.map((w) => ({
          id: w.id,
          attributes: {
            name: w.name,
            description: w.description,
            isEnabled: w.is_enabled,
            isLockedForEditing: w.is_locked_for_editing
          }
        })),
        cursor,
        limit,
        workflows.length
      )
    );
  });
  app.get("/v1/ciWorkflows/:id", (c) => {
    const id = c.req.param("id");
    const workflow = getWorkflows(store).find((w) => w.id === id);
    if (!workflow) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `CiWorkflow ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "ciWorkflows", workflow.id, {
        name: workflow.name,
        description: workflow.description,
        isEnabled: workflow.is_enabled,
        isLockedForEditing: workflow.is_locked_for_editing
      })
    );
  });
  app.get("/v1/ciWorkflows/:workflowId/buildRuns", (c) => {
    const workflowId = c.req.param("workflowId");
    const runs = getBuildRuns(store).filter((r) => r.workflow_id === workflowId);
    const { cursor, limit } = parseCursor(c);
    const page = runs.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "ciBuildRuns",
        page.map((r) => ({
          id: r.id,
          attributes: {
            number: r.number,
            executionProgress: r.execution_progress,
            completionStatus: r.completion_status,
            sourceCommit: r.source_commit_sha ? { commitSha: r.source_commit_sha } : null,
            destinationBranch: r.destination_branch,
            startedDate: r.started_date,
            finishedDate: r.finished_date
          }
        })),
        cursor,
        limit,
        runs.length
      )
    );
  });
  app.get("/v1/ciBuildRuns/:id", (c) => {
    const id = c.req.param("id");
    const run = getBuildRuns(store).find((r) => r.id === id);
    if (!run) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `CiBuildRun ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "ciBuildRuns", run.id, {
        number: run.number,
        executionProgress: run.execution_progress,
        completionStatus: run.completion_status,
        sourceCommit: run.source_commit_sha ? { commitSha: run.source_commit_sha } : null,
        destinationBranch: run.destination_branch,
        startedDate: run.started_date,
        finishedDate: run.finished_date
      })
    );
  });
  app.post("/v1/ciBuildRuns", async (c) => {
    const body = await parseJsonApiBody(c);
    const workflowRel = body.relationships?.workflow;
    const workflowId = workflowRel?.data?.id ?? "";
    if (!workflowId) {
      return c.json(jsonApiError(422, "INVALID_INPUT", "Invalid Input", "Missing workflow relationship"), 422);
    }
    const run = {
      id: ascId(),
      workflow_id: workflowId,
      number: getBuildRuns(store).length + 1,
      execution_progress: "COMPLETE",
      completion_status: "SUCCEEDED",
      source_commit_sha: null,
      destination_branch: null,
      started_date: (/* @__PURE__ */ new Date()).toISOString(),
      finished_date: (/* @__PURE__ */ new Date()).toISOString()
    };
    const runs = getBuildRuns(store);
    runs.push(run);
    setBuildRuns(store, runs);
    return c.json(
      jsonApiResource(baseUrl, "ciBuildRuns", run.id, {
        number: run.number,
        executionProgress: run.execution_progress,
        completionStatus: run.completion_status,
        startedDate: run.started_date,
        finishedDate: run.finished_date
      }),
      201
    );
  });
  app.get("/v1/ciBuildRuns/:runId/actions", (c) => {
    const runId = c.req.param("runId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciBuildActions",
        [
          {
            id: `action-${runId}`,
            attributes: {
              name: "Build",
              actionType: "BUILD",
              executionProgress: "COMPLETE",
              completionStatus: "SUCCEEDED"
            }
          }
        ],
        0,
        50,
        1
      )
    );
  });
  app.get("/v1/ciBuildActions/:actionId/artifacts", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciArtifacts",
        [
          {
            id: `artifact-${actionId}`,
            attributes: { fileName: "App.ipa", fileSize: 1024, fileType: "ARCHIVE" }
          }
        ],
        0,
        50,
        1
      )
    );
  });
  app.get("/v1/ciBuildActions/:actionId/testResults", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciTestResults",
        [
          {
            id: `test-${actionId}`,
            attributes: { className: "AppTests", name: "testExample", status: "SUCCESS" }
          }
        ],
        0,
        50,
        1
      )
    );
  });
  app.get("/v1/ciBuildActions/:actionId/issues", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciIssues",
        [
          {
            id: `issue-${actionId}`,
            attributes: { issueType: "WARNING", message: "Unused variable" }
          }
        ],
        0,
        50,
        1
      )
    );
  });
  app.get("/v1/ciMacOsVersions", (c) => {
    return c.json(
      jsonApiList(
        baseUrl,
        "ciMacOsVersions",
        [{ id: "macos-1", attributes: { version: "14.0", name: "macOS Sonoma" } }],
        0,
        50,
        1
      )
    );
  });
  app.get("/v1/ciXcodeVersions", (c) => {
    return c.json(
      jsonApiList(
        baseUrl,
        "ciXcodeVersions",
        [{ id: "xcode-1", attributes: { version: "15.0", name: "Xcode 15" } }],
        0,
        50,
        1
      )
    );
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/testflight.ts
function getBetaGroups(store) {
  return store.getData("asc.beta_groups") ?? [];
}
function setBetaGroups(store, groups) {
  store.setData("asc.beta_groups", groups);
}
function getBetaTesters(store) {
  return store.getData("asc.beta_testers") ?? [];
}
function setBetaTesters(store, testers) {
  store.setData("asc.beta_testers", testers);
}
function getLocalizations(store) {
  return store.getData("asc.beta_build_localizations") ?? [];
}
function setLocalizations(store, locs) {
  store.setData("asc.beta_build_localizations", locs);
}
function testflightRoutes({ app, store, baseUrl }) {
  app.get("/v1/betaGroups", (c) => {
    const groups = getBetaGroups(store);
    const appFilter = c.req.query("filter[app]");
    const { cursor, limit } = parseCursor(c);
    let filtered = groups;
    if (appFilter) {
      filtered = groups.filter((g) => g.app_id === appFilter);
    }
    const page = filtered.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "betaGroups",
        page.map((g) => ({
          id: g.id,
          attributes: {
            name: g.name,
            isInternalGroup: g.is_internal_group,
            publicLinkEnabled: g.public_link_enabled,
            createdDate: g.created_date
          }
        })),
        cursor,
        limit,
        filtered.length
      )
    );
  });
  app.post("/v1/betaGroups", async (c) => {
    const body = await parseJsonApiBody(c);
    const name = body.attributes.name ?? "";
    const isInternal = body.attributes.isInternalGroup ?? false;
    const publicLink = body.attributes.publicLinkEnabled ?? false;
    const appRel = body.relationships?.app;
    const appId = appRel?.data?.id ?? "";
    const group = {
      id: ascId(),
      app_id: appId,
      name,
      is_internal_group: isInternal,
      public_link_enabled: publicLink,
      created_date: (/* @__PURE__ */ new Date()).toISOString()
    };
    const groups = getBetaGroups(store);
    groups.push(group);
    setBetaGroups(store, groups);
    return c.json(
      jsonApiResource(baseUrl, "betaGroups", group.id, {
        name: group.name,
        isInternalGroup: group.is_internal_group,
        publicLinkEnabled: group.public_link_enabled,
        createdDate: group.created_date
      }),
      201
    );
  });
  app.delete("/v1/betaGroups/:id", (c) => {
    const id = c.req.param("id");
    const groups = getBetaGroups(store);
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaGroup ${id} not found`), 404);
    }
    groups.splice(idx, 1);
    setBetaGroups(store, groups);
    return c.body(null, 204);
  });
  app.get("/v1/betaTesters", (c) => {
    const testers = getBetaTesters(store);
    const groupFilter = c.req.query("filter[betaGroups]");
    const { cursor, limit } = parseCursor(c);
    const page = testers.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "betaTesters",
        page.map((t) => ({
          id: t.id,
          attributes: {
            email: t.email,
            firstName: t.first_name,
            lastName: t.last_name,
            inviteType: t.invite_type,
            state: t.state
          }
        })),
        cursor,
        limit,
        testers.length
      )
    );
  });
  app.post("/v1/betaTesters", async (c) => {
    const body = await parseJsonApiBody(c);
    const email = body.attributes.email ?? "";
    const firstName = body.attributes.firstName ?? null;
    const lastName = body.attributes.lastName ?? null;
    const tester = {
      id: ascId(),
      email,
      first_name: firstName,
      last_name: lastName,
      invite_type: null,
      state: null
    };
    const testers = getBetaTesters(store);
    testers.push(tester);
    setBetaTesters(store, testers);
    return c.json(
      jsonApiResource(baseUrl, "betaTesters", tester.id, {
        email: tester.email,
        firstName: tester.first_name,
        lastName: tester.last_name
      }),
      201
    );
  });
  app.get("/v1/builds/:buildId/betaBuildLocalizations", (c) => {
    const buildId = c.req.param("buildId");
    const locs = getLocalizations(store).filter((l) => l.build_id === buildId);
    return c.json(
      jsonApiList(
        baseUrl,
        "betaBuildLocalizations",
        locs.map((l) => ({
          id: l.id,
          attributes: { locale: l.locale, whatsNew: l.whats_new }
        })),
        0,
        50,
        locs.length
      )
    );
  });
  app.post("/v1/betaBuildLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const locale = body.attributes.locale ?? "en-US";
    const whatsNew = body.attributes.whatsNew ?? "";
    const buildRel = body.relationships?.build;
    const buildId = buildRel?.data?.id ?? "";
    const loc = { id: ascId(), build_id: buildId, locale, whats_new: whatsNew };
    const locs = getLocalizations(store);
    locs.push(loc);
    setLocalizations(store, locs);
    return c.json(
      jsonApiResource(baseUrl, "betaBuildLocalizations", loc.id, { locale: loc.locale, whatsNew: loc.whats_new }),
      201
    );
  });
  app.patch("/v1/betaBuildLocalizations/:id", async (c) => {
    const id = c.req.param("id");
    const locs = getLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaBuildLocalization ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    if (body.attributes.whatsNew !== void 0) {
      locs[idx].whats_new = body.attributes.whatsNew;
    }
    setLocalizations(store, locs);
    return c.json(
      jsonApiResource(baseUrl, "betaBuildLocalizations", locs[idx].id, {
        locale: locs[idx].locale,
        whatsNew: locs[idx].whats_new
      })
    );
  });
  app.delete("/v1/betaBuildLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const locs = getLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `BetaBuildLocalization ${id} not found`), 404);
    }
    locs.splice(idx, 1);
    setLocalizations(store, locs);
    return c.body(null, 204);
  });
  app.get("/v1/apps/:appId/betaAppReviewDetail", (c) => {
    const appId = c.req.param("appId");
    return c.json(
      jsonApiResource(baseUrl, "betaAppReviewDetails", `review-detail-${appId}`, {})
    );
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/upload.ts
function getUploads(store) {
  return store.getData("asc.uploads") ?? [];
}
function setUploads(store, uploads) {
  store.setData("asc.uploads", uploads);
}
function getBuildUploads(store) {
  return store.getData("asc.build_uploads") ?? [];
}
function setBuildUploads(store, uploads) {
  store.setData("asc.build_uploads", uploads);
}
function getBuildUploadFiles(store) {
  return store.getData("asc.build_upload_files") ?? [];
}
function setBuildUploadFiles(store, files) {
  store.setData("asc.build_upload_files", files);
}
function uploadRoutes({ app, store, baseUrl }) {
  const asc = getASCStore(store);
  app.post("/v1/buildUploads", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const attrs = body?.data?.attributes ?? {};
    const appId = body?.data?.relationships?.app?.data?.id ?? "";
    const upload = {
      id: ascId(),
      app_id: appId,
      version: attrs.cfBundleShortVersionString ?? attrs.version ?? "1.0.0",
      build_number: attrs.cfBundleVersion ?? attrs.buildNumber ?? "1",
      platform: attrs.platform ?? "IOS",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    setBuildUploads(store, [...getBuildUploads(store), upload]);
    return c.json(jsonApiResource(baseUrl, "buildUploads", upload.id, {
      cfBundleShortVersionString: upload.version,
      cfBundleVersion: upload.build_number,
      platform: upload.platform,
      uploadedDate: upload.created_at
    }), 201);
  });
  app.post("/v1/buildUploadFiles", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const attrs = body?.data?.attributes ?? {};
    const buildUploadId = body?.data?.relationships?.buildUpload?.data?.id ?? "";
    const fileSize = Number(attrs.fileSize ?? 0);
    const id = ascId();
    const file = {
      id,
      build_upload_id: buildUploadId,
      file_name: attrs.fileName ?? "App.ipa",
      file_size: fileSize,
      uploaded: false,
      upload_operations: [{
        method: "PUT",
        url: `${baseUrl}/asc/uploads/${id}/0`,
        length: fileSize,
        offset: 0
      }]
    };
    setBuildUploadFiles(store, [...getBuildUploadFiles(store), file]);
    return c.json(jsonApiResource(baseUrl, "buildUploadFiles", file.id, {
      fileName: file.file_name,
      fileSize: file.file_size,
      uploaded: file.uploaded,
      uploadOperations: file.upload_operations
    }), 201);
  });
  app.put("/asc/uploads/:fileId/:operationIndex", async (c) => {
    const fileId = c.req.param("fileId");
    const operationIndex = c.req.param("operationIndex");
    const bytes = await c.req.arrayBuffer().catch(() => new ArrayBuffer(0));
    const chunks = store.getData("asc.upload_chunks") ?? {};
    chunks[`${fileId}:${operationIndex}`] = bytes.byteLength;
    store.setData("asc.upload_chunks", chunks);
    return c.json({ fileId, operationIndex, receivedBytes: bytes.byteLength });
  });
  app.patch("/v1/buildUploadFiles/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const files = getBuildUploadFiles(store);
    const index = files.findIndex((file) => file.id === id);
    if (index < 0) return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build upload file ${id} not found`), 404);
    const attrs = body?.data?.attributes ?? {};
    files[index] = { ...files[index], uploaded: attrs.uploaded ?? files[index].uploaded };
    setBuildUploadFiles(store, files);
    if (files[index].uploaded) {
      const upload = getBuildUploads(store).find((item) => item.id === files[index].build_upload_id);
      if (upload && !asc.builds.findOneBy("asc_id", `build-${upload.id}`)) {
        asc.builds.insert({
          asc_id: `build-${upload.id}`,
          app_id: upload.app_id,
          version: upload.build_number,
          processing_state: "PROCESSING",
          is_expired: false
        });
      }
    }
    return c.json(jsonApiResource(baseUrl, "buildUploadFiles", files[index].id, {
      fileName: files[index].file_name,
      fileSize: files[index].file_size,
      uploaded: files[index].uploaded,
      uploadOperations: files[index].upload_operations
    }));
  });
  app.post("/asc/control/advance-builds", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const processingState = body?.processingState ?? "VALID";
    const builds = asc.builds.all().map((build) => asc.builds.update(build.id, { processing_state: processingState }) ?? build);
    return c.json({
      builds: builds.map((build) => ({
        type: "builds",
        id: build.asc_id,
        attributes: {
          version: build.version,
          buildNumber: build.version,
          processingState: build.processing_state,
          expired: build.is_expired
        }
      }))
    });
  });
  app.post("/v1/builds/upload", async (c) => {
    const body = await c.req.json();
    const appId = body?.appId ?? "";
    const fileName = body?.fileName ?? "App.ipa";
    const fileSize = body?.fileSize ?? 0;
    const version = body?.version ?? "1.0.0";
    const buildNumber = body?.buildNumber ?? "1";
    const platform = body?.platform ?? "IOS";
    const upload = {
      id: ascId(),
      app_id: appId,
      file_name: fileName,
      file_size: fileSize,
      version,
      build_number: buildNumber,
      platform,
      uploaded_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const uploads = getUploads(store);
    uploads.push(upload);
    setUploads(store, uploads);
    return c.json({
      uploadID: upload.id,
      fileID: `file-${upload.id}`,
      fileName: upload.file_name,
      fileSize: upload.file_size,
      version: upload.version,
      buildNumber: upload.build_number,
      platform: upload.platform
    }, 201);
  });
  app.get("/v1/builds/uploads", (c) => {
    const uploads = getUploads(store);
    return c.json({ data: uploads });
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/analytics.ts
function getSnapshot(store) {
  return store.getData("asc.analytics_snapshot") ?? null;
}
function analyticsRoutes({ app, store, baseUrl }) {
  app.get("/v1/analyticsReportRequests", (c) => {
    const snapshot = getSnapshot(store);
    if (!snapshot) {
      return c.json({ data: [], links: { self: `${baseUrl}/v1/analyticsReportRequests` }, meta: { paging: { total: 0, limit: 50 } } });
    }
    return c.json({
      data: snapshot.reports.map((r) => ({
        type: "analyticsReportRequests",
        id: r.request_id,
        attributes: { category: r.category, name: r.name }
      })),
      links: { self: `${baseUrl}/v1/analyticsReportRequests` },
      meta: { paging: { total: snapshot.reports.length, limit: 50 } }
    });
  });
  app.get("/v1/apps/:appId/perfPowerMetrics", (c) => {
    const snapshot = getSnapshot(store);
    if (!snapshot?.metrics) {
      return c.json({ data: [] });
    }
    return c.json({
      data: snapshot.metrics.advanced_metrics.map((m) => ({
        type: "perfPowerMetrics",
        id: m.key,
        attributes: {
          metricType: m.key,
          label: m.label,
          value: m.value,
          percentiles: { p25: m.p25, p50: m.p50, p75: m.p75 }
        }
      }))
    });
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/apps.ts
function appRoutes({ app, store, baseUrl }) {
  const asc = getASCStore(store);
  app.get("/v1/apps", (c) => {
    const all = asc.apps.all();
    const { cursor, limit } = parseCursor(c);
    const page = all.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "apps",
        page.map((a) => ({
          id: a.asc_id,
          attributes: {
            name: a.name,
            bundleId: a.bundle_id,
            primaryLocale: a.primary_locale
          }
        })),
        cursor,
        limit,
        all.length
      )
    );
  });
  app.get("/v1/apps/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.apps.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `App ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "apps", found.asc_id, {
        name: found.name,
        bundleId: found.bundle_id,
        primaryLocale: found.primary_locale
      })
    );
  });
  app.patch("/v1/apps/:id", async (c) => {
    const id = c.req.param("id");
    const found = asc.apps.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `App ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    const updates = {};
    if (body.attributes.bundleId !== void 0) updates.bundle_id = body.attributes.bundleId;
    if (body.attributes.primaryLocale !== void 0) updates.primary_locale = body.attributes.primaryLocale;
    if (body.attributes.name !== void 0) updates.name = body.attributes.name;
    const updated = asc.apps.update(found.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(
      jsonApiResource(baseUrl, "apps", updated.asc_id, {
        name: updated.name,
        bundleId: updated.bundle_id,
        primaryLocale: updated.primary_locale
      })
    );
  });
  app.get("/v1/apps/:id/appInfos", (c) => {
    const id = c.req.param("id");
    return c.json(
      jsonApiList(baseUrl, "appInfos", [{ id, attributes: {} }], 0, 50, 1)
    );
  });
  app.get("/v1/builds", (c) => {
    const appFilter = c.req.query("filter[app]");
    const { cursor, limit } = parseCursor(c);
    let all = asc.builds.all();
    if (appFilter) {
      all = all.filter((b) => b.app_id === appFilter);
    }
    const page = all.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "builds",
        page.map((b) => ({
          id: b.asc_id,
          attributes: {
            version: b.version,
            buildNumber: b.version,
            processingState: b.processing_state,
            expired: b.is_expired
          }
        })),
        cursor,
        limit,
        all.length
      )
    );
  });
  app.get("/v1/builds/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.builds.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "builds", found.asc_id, {
        version: found.version,
        buildNumber: found.version,
        processingState: found.processing_state,
        expired: found.is_expired
      })
    );
  });
  app.delete("/v1/builds/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.builds.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build ${id} not found`), 404);
    }
    asc.builds.delete(found.id);
    return c.body(null, 204);
  });
  app.get("/v1/apps/:appId/appStoreVersions", (c) => {
    const appId = c.req.param("appId");
    const { cursor, limit } = parseCursor(c);
    const all = asc.versions.all().filter((v) => v.app_id === appId);
    const page = all.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreVersions",
        page.map((v) => ({
          id: v.asc_id,
          attributes: {
            versionString: v.version_string,
            platform: v.platform,
            appStoreState: v.app_store_state
          }
        })),
        cursor,
        limit,
        all.length
      )
    );
  });
  app.get("/v1/appStoreVersions/:id", (c) => {
    const id = c.req.param("id");
    const found = asc.versions.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Version ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersions", found.asc_id, {
        versionString: found.version_string,
        platform: found.platform,
        appStoreState: found.app_store_state
      })
    );
  });
  app.post("/v1/appStoreVersions", async (c) => {
    const body = await parseJsonApiBody(c);
    const versionString = body.attributes.versionString ?? "1.0.0";
    const platform = body.attributes.platform ?? "IOS";
    const appRel = body.relationships?.app;
    const appId = appRel?.data?.id ?? "";
    const version = asc.versions.insert({
      asc_id: ascId(),
      app_id: appId,
      version_string: versionString,
      platform,
      app_store_state: "PREPARE_FOR_SUBMISSION"
    });
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersions", version.asc_id, {
        versionString: version.version_string,
        platform: version.platform,
        appStoreState: version.app_store_state
      }),
      201
    );
  });
  app.patch("/v1/appStoreVersions/:id/relationships/build", async (c) => {
    const id = c.req.param("id");
    const found = asc.versions.findOneBy("asc_id", id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Version ${id} not found`), 404);
    }
    const body = await c.req.json().catch(() => ({}));
    const buildId = body?.data?.id;
    if (!buildId || !asc.builds.findOneBy("asc_id", buildId)) {
      return c.json(jsonApiError(409, "INVALID_RELATIONSHIP", "Invalid Relationship", "Build relationship is invalid"), 409);
    }
    store.setData(`asc.version.${id}.build`, buildId);
    return c.json({ data: { type: "builds", id: buildId } });
  });
  app.get("/v1/apps/:id/appPriceSchedule", (c) => {
    const id = c.req.param("id");
    return c.json(jsonApiResource(baseUrl, "appPriceSchedules", `price-schedule-${id}`, {
      appId: id,
      customerPrice: 0,
      proceeds: 0
    }));
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/metadata.ts
function getAppInfoLocalizations(store) {
  return store.getData("asc.app_info_localizations") ?? [];
}
function setAppInfoLocalizations(store, locs) {
  store.setData("asc.app_info_localizations", locs);
}
function metadataRoutes({ app, store, baseUrl }) {
  const asc = getASCStore(store);
  app.get("/v1/appStoreVersions/:versionId/appStoreVersionLocalizations", (c) => {
    const versionId = c.req.param("versionId");
    const locs = asc.localizations.all().filter((l) => l.version_id === versionId);
    const { cursor, limit } = parseCursor(c);
    const page = locs.slice(cursor, cursor + limit);
    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreVersionLocalizations",
        page.map((l) => ({
          id: l.asc_id,
          attributes: {
            locale: l.locale,
            description: l.description,
            keywords: l.keywords,
            marketingUrl: l.marketing_url,
            promotionalText: l.promotional_text,
            supportUrl: l.support_url,
            whatsNew: l.whats_new
          }
        })),
        cursor,
        limit,
        locs.length
      )
    );
  });
  app.get("/v1/appStoreVersionLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", loc.asc_id, {
        locale: loc.locale,
        description: loc.description,
        keywords: loc.keywords,
        marketingUrl: loc.marketing_url,
        promotionalText: loc.promotional_text,
        supportUrl: loc.support_url,
        whatsNew: loc.whats_new
      })
    );
  });
  app.post("/v1/appStoreVersionLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const locale = body.attributes.locale ?? "en-US";
    const versionRel = body.relationships?.appStoreVersion;
    const versionId = versionRel?.data?.id ?? "";
    const loc = asc.localizations.insert({
      asc_id: ascId(),
      version_id: versionId,
      locale,
      description: body.attributes.description ?? null,
      keywords: body.attributes.keywords ?? null,
      marketing_url: body.attributes.marketingUrl ?? null,
      promotional_text: body.attributes.promotionalText ?? null,
      support_url: body.attributes.supportUrl ?? null,
      whats_new: body.attributes.whatsNew ?? null
    });
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", loc.asc_id, {
        locale: loc.locale,
        description: loc.description
      }),
      201
    );
  });
  app.patch("/v1/appStoreVersionLocalizations/:id", async (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    const updates = {};
    if (body.attributes.description !== void 0) updates.description = body.attributes.description;
    if (body.attributes.keywords !== void 0) updates.keywords = body.attributes.keywords;
    if (body.attributes.marketingUrl !== void 0) updates.marketing_url = body.attributes.marketingUrl;
    if (body.attributes.promotionalText !== void 0) updates.promotional_text = body.attributes.promotionalText;
    if (body.attributes.supportUrl !== void 0) updates.support_url = body.attributes.supportUrl;
    if (body.attributes.whatsNew !== void 0) updates.whats_new = body.attributes.whatsNew;
    const updated = asc.localizations.update(loc.id, updates);
    if (!updated) {
      return c.json(jsonApiError(500, "INTERNAL_ERROR", "Internal Error", "Failed to update"), 500);
    }
    return c.json(
      jsonApiResource(baseUrl, "appStoreVersionLocalizations", updated.asc_id, {
        locale: updated.locale,
        description: updated.description,
        keywords: updated.keywords,
        marketingUrl: updated.marketing_url,
        promotionalText: updated.promotional_text,
        supportUrl: updated.support_url,
        whatsNew: updated.whats_new
      })
    );
  });
  app.delete("/v1/appStoreVersionLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const loc = asc.localizations.findOneBy("asc_id", id);
    if (!loc) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Localization ${id} not found`), 404);
    }
    asc.localizations.delete(loc.id);
    return c.body(null, 204);
  });
  app.get("/v1/appInfos/:appInfoId/appInfoLocalizations", (c) => {
    const locs = getAppInfoLocalizations(store);
    return c.json(jsonApiList(baseUrl, "appInfoLocalizations", locs.map((l) => ({
      id: l.id,
      attributes: { locale: l.locale, name: l.name, subtitle: l.subtitle }
    })), 0, 50, locs.length));
  });
  app.post("/v1/appInfoLocalizations", async (c) => {
    const body = await parseJsonApiBody(c);
    const loc = {
      id: ascId(),
      locale: body.attributes.locale ?? "en-US",
      name: body.attributes.name ?? null,
      subtitle: body.attributes.subtitle ?? null,
      privacy_policy_url: body.attributes.privacyPolicyUrl ?? null,
      privacy_choices_url: body.attributes.privacyChoicesUrl ?? null,
      privacy_policy_text: body.attributes.privacyPolicyText ?? null
    };
    const locs = getAppInfoLocalizations(store);
    locs.push(loc);
    setAppInfoLocalizations(store, locs);
    return c.json(jsonApiResource(baseUrl, "appInfoLocalizations", loc.id, { locale: loc.locale, name: loc.name }), 201);
  });
  app.delete("/v1/appInfoLocalizations/:id", (c) => {
    const id = c.req.param("id");
    const locs = getAppInfoLocalizations(store);
    const idx = locs.findIndex((l) => l.id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `AppInfoLocalization ${id} not found`), 404);
    }
    locs.splice(idx, 1);
    setAppInfoLocalizations(store, locs);
    return c.body(null, 204);
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/review-detail.ts
function getDetails(store) {
  let map = store.getData("asc.review_details");
  if (!map) {
    map = /* @__PURE__ */ new Map();
    store.setData("asc.review_details", map);
  }
  return map;
}
function reviewDetailRoutes({ app, store, baseUrl }) {
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
      notes: null
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
        notes: detail.notes
      })
    );
  });
  app.patch("/v1/appStoreReviewDetails/:id", async (c) => {
    const id = c.req.param("id");
    const body = await parseJsonApiBody(c);
    const detail = {
      id,
      contact_first_name: body.attributes.contactFirstName ?? null,
      contact_last_name: body.attributes.contactLastName ?? null,
      contact_phone: body.attributes.contactPhone ?? null,
      contact_email: body.attributes.contactEmail ?? null,
      demo_account_name: body.attributes.demoAccountName ?? null,
      demo_account_password: body.attributes.demoAccountPassword ?? null,
      is_demo_account_required: body.attributes.demoAccountRequired ?? false,
      notes: body.attributes.notes ?? null
    };
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
        notes: detail.notes
      })
    );
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/review-items.ts
function getItems(store) {
  return store.getData("asc.review_submission_items") ?? [];
}
function setItems(store, items) {
  store.setData("asc.review_submission_items", items);
}
function getAttachments(store) {
  return store.getData("asc.review_attachments") ?? [];
}
function setAttachments(store, attachments) {
  store.setData("asc.review_attachments", attachments);
}
function reviewItemRoutes({ app, store, baseUrl }) {
  app.get("/v1/reviewSubmissions/:submissionId/items", (c) => {
    const submissionId = c.req.param("submissionId");
    const items = getItems(store).filter((i) => i.submission_id === submissionId);
    return c.json(
      jsonApiList(
        baseUrl,
        "reviewSubmissionItems",
        items.map((i) => ({
          id: i.id,
          attributes: { state: i.state, appStoreVersionId: i.app_store_version_id }
        })),
        0,
        50,
        items.length
      )
    );
  });
  app.post("/v1/reviewSubmissionItems", async (c) => {
    const body = await parseJsonApiBody(c);
    const submissionRel = body.relationships?.reviewSubmission;
    const submissionId = submissionRel?.data?.id ?? "";
    const versionRel = body.relationships?.appStoreVersion;
    const versionId = versionRel?.data?.id ?? "";
    const item = {
      id: ascId(),
      submission_id: submissionId,
      state: "READY_FOR_REVIEW",
      app_store_version_id: versionId
    };
    const items = getItems(store);
    items.push(item);
    setItems(store, items);
    return c.json(
      jsonApiResource(baseUrl, "reviewSubmissionItems", item.id, {
        state: item.state,
        appStoreVersionId: item.app_store_version_id
      }),
      201
    );
  });
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
  app.get("/v1/appStoreReviewDetails/:detailId/appStoreReviewAttachments", (c) => {
    const detailId = c.req.param("detailId");
    const attachments = getAttachments(store).filter((a) => a.review_detail_id === detailId);
    return c.json(
      jsonApiList(
        baseUrl,
        "appStoreReviewAttachments",
        attachments.map((a) => ({
          id: a.id,
          attributes: { fileName: a.file_name, fileSize: a.file_size }
        })),
        0,
        50,
        attachments.length
      )
    );
  });
  app.post("/v1/appStoreReviewAttachments", async (c) => {
    const body = await parseJsonApiBody(c);
    const detailRel = body.relationships?.appStoreReviewDetail;
    const detailId = detailRel?.data?.id ?? "";
    const fileName = body.attributes.fileName ?? "attachment.png";
    const fileSize = body.attributes.fileSize ?? 0;
    const attachment = {
      id: ascId(),
      review_detail_id: detailId,
      file_name: fileName,
      file_size: fileSize
    };
    const attachments = getAttachments(store);
    attachments.push(attachment);
    setAttachments(store, attachments);
    return c.json(
      jsonApiResource(baseUrl, "appStoreReviewAttachments", attachment.id, {
        fileName: attachment.file_name,
        fileSize: attachment.file_size
      }),
      201
    );
  });
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

// ../api-emulator-plugins/@apple/api-emulator/src/crud.ts
function snakeCase(s) {
  return s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}
function registerCrud(app, store, baseUrl, config) {
  const collectionName = `asc.crud.${config.type}`;
  function getCollection() {
    let items = store.getData(collectionName);
    if (!items) {
      items = [];
      store.setData(collectionName, items);
    }
    return items;
  }
  function formatItem(item) {
    const attrs = {};
    for (const field of config.fields) {
      const storeKey = snakeCase(field);
      attrs[field] = item[storeKey] ?? item[field] ?? null;
    }
    return { id: item.asc_id, attributes: attrs };
  }
  app.get(config.basePath, (c) => {
    const { cursor, limit } = parseCursor(c);
    let items = getCollection();
    if (config.parent) {
      const parentValue = c.req.param(config.parent.param);
      if (parentValue) {
        items = items.filter((i) => i[config.parent.storeField] === parentValue);
      }
      const filterValue = c.req.query(`filter[${config.parent.param}]`);
      if (filterValue) {
        items = items.filter((i) => i[config.parent.storeField] === filterValue);
      }
    }
    const total = items.length;
    const page = items.slice(cursor, cursor + limit);
    return c.json(jsonApiList(baseUrl, config.type, page.map(formatItem), cursor, limit, total));
  });
  app.get(`${config.basePath}/:id`, (c) => {
    const id = c.req.param("id");
    const items = getCollection();
    const found = items.find((i) => i.asc_id === id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `${config.type} ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, config.type, found.asc_id, formatItem(found).attributes));
  });
  if (!config.readOnly) {
    app.post(config.basePath, async (c) => {
      const body = await parseJsonApiBody(c);
      const item = { asc_id: ascId() };
      for (const field of config.fields) {
        const storeKey = snakeCase(field);
        item[storeKey] = body.attributes[field] ?? null;
        item[field] = body.attributes[field] ?? null;
      }
      if (body.relationships) {
        for (const [relName, relData] of Object.entries(body.relationships)) {
          if (relData?.data?.id) {
            const storeKey = snakeCase(relName) + "_id";
            item[storeKey] = relData.data.id;
            for (const alias of config.relationshipStoreFields?.[relName] ?? []) {
              item[alias] = relData.data.id;
            }
          }
        }
      }
      const items = getCollection();
      items.push(item);
      store.setData(collectionName, items);
      return c.json(jsonApiResource(baseUrl, config.type, item.asc_id, formatItem(item).attributes), 201);
    });
  }
  app.patch(`${config.basePath}/:id`, async (c) => {
    const id = c.req.param("id");
    const items = getCollection();
    const idx = items.findIndex((i) => i.asc_id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `${config.type} ${id} not found`), 404);
    }
    const body = await parseJsonApiBody(c);
    for (const field of config.fields) {
      if (body.attributes[field] !== void 0) {
        const storeKey = snakeCase(field);
        items[idx][storeKey] = body.attributes[field];
        items[idx][field] = body.attributes[field];
      }
    }
    store.setData(collectionName, items);
    return c.json(jsonApiResource(baseUrl, config.type, id, formatItem(items[idx]).attributes));
  });
  if (!config.noDelete) {
    app.delete(`${config.basePath}/:id`, (c) => {
      const id = c.req.param("id");
      const items = getCollection();
      const idx = items.findIndex((i) => i.asc_id === id);
      if (idx === -1) {
        return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `${config.type} ${id} not found`), 404);
      }
      items.splice(idx, 1);
      store.setData(collectionName, items);
      return c.body(null, 204);
    });
  }
}
function registerNestedList(app, store, baseUrl, parentPath, config, parentParam, storeField) {
  const collectionName = `asc.crud.${config.type}`;
  function getCollection() {
    return store.getData(collectionName) ?? [];
  }
  function formatItem(item) {
    const attrs = {};
    for (const field of config.fields) {
      const storeKey = snakeCase(field);
      attrs[field] = item[storeKey] ?? item[field] ?? null;
    }
    return { id: item.asc_id, attributes: attrs };
  }
  app.get(parentPath, (c) => {
    const parentId = c.req.param(parentParam);
    const { cursor, limit } = parseCursor(c);
    const items = getCollection().filter((i) => i[storeField] === parentId);
    const page = items.slice(cursor, cursor + limit);
    return c.json(jsonApiList(baseUrl, config.type, page.map(formatItem), cursor, limit, items.length));
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/stubs.ts
function stubRoutes({ app, store, baseUrl }) {
  const reg = (config) => registerCrud(app, store, baseUrl, config);
  const nested = (parentPath, config, parentParam, storeField) => registerNestedList(app, store, baseUrl, parentPath, config, parentParam, storeField);
  const certConfig = {
    type: "certificates",
    basePath: "/v1/certificates",
    fields: ["certificateType", "displayName", "serialNumber", "platform", "expirationDate", "certificateContent"]
  };
  reg(certConfig);
  const profileConfig = {
    type: "profiles",
    basePath: "/v1/profiles",
    fields: ["name", "profileType", "profileState", "profileContent", "uuid", "platform", "expirationDate"]
  };
  reg(profileConfig);
  const deviceConfig = {
    type: "devices",
    basePath: "/v1/devices",
    fields: ["name", "udid", "platform", "status", "deviceClass", "model", "addedDate"]
  };
  reg(deviceConfig);
  const bundleIdConfig = {
    type: "bundleIds",
    basePath: "/v1/bundleIds",
    fields: ["identifier", "name", "platform", "seedId"]
  };
  reg(bundleIdConfig);
  const ssSetConfig = {
    type: "appScreenshotSets",
    basePath: "/v1/appScreenshotSets",
    fields: ["screenshotDisplayType"]
  };
  reg(ssSetConfig);
  nested("/v1/appStoreVersionLocalizations/:locId/appScreenshotSets", ssSetConfig, "locId", "localization_id");
  const ssConfig = {
    type: "appScreenshots",
    basePath: "/v1/appScreenshots",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "imageAsset", "assetToken", "uploadOperations"]
  };
  reg(ssConfig);
  nested("/v1/appScreenshotSets/:setId/appScreenshots", ssConfig, "setId", "screenshot_set_id");
  const previewSetConfig = {
    type: "appPreviewSets",
    basePath: "/v1/appPreviewSets",
    fields: ["previewType"]
  };
  reg(previewSetConfig);
  nested("/v1/appStoreVersionLocalizations/:locId/appPreviewSets", previewSetConfig, "locId", "localization_id");
  const previewConfig = {
    type: "appPreviews",
    basePath: "/v1/appPreviews",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "previewFrameTimeCode", "mimeType", "videoUrl"]
  };
  reg(previewConfig);
  const cppConfig = {
    type: "appCustomProductPages",
    basePath: "/v1/appCustomProductPages",
    fields: ["name", "url", "visible"]
  };
  reg(cppConfig);
  nested("/v1/apps/:appId/appCustomProductPages", cppConfig, "appId", "app_id");
  reg({
    type: "appCustomProductPageVersions",
    basePath: "/v1/appCustomProductPageVersions",
    fields: ["version", "state"],
    readOnly: true
  });
  nested("/v1/appCustomProductPages/:pageId/appCustomProductPageVersions", {
    type: "appCustomProductPageVersions",
    basePath: "/v1/appCustomProductPageVersions",
    fields: ["version", "state"]
  }, "pageId", "page_id");
  const iapConfig = {
    type: "inAppPurchases",
    basePath: "/v2/inAppPurchases",
    fields: ["name", "productId", "inAppPurchaseType", "state", "reviewNote", "isFamilySharable", "contentHosting"]
  };
  reg(iapConfig);
  nested("/v1/apps/:appId/inAppPurchasesV2", iapConfig, "appId", "app_id");
  reg({
    type: "inAppPurchaseImages",
    basePath: "/v1/inAppPurchaseImages",
    fields: ["fileSize", "fileName", "sourceFileChecksum", "imageAsset", "assetToken"]
  });
  reg({
    type: "inAppPurchasePriceSchedules",
    basePath: "/v1/inAppPurchasePriceSchedules",
    fields: ["baseTerritory", "manualPrices"],
    readOnly: true,
    noDelete: true
  });
  reg({
    type: "inAppPurchaseAvailabilities",
    basePath: "/v1/inAppPurchaseAvailabilities",
    fields: ["availableInNewTerritories"],
    noDelete: true
  });
  reg({ type: "inAppPurchaseSubmissions", basePath: "/v1/inAppPurchaseSubmissions", fields: [] });
  const subGroupConfig = {
    type: "subscriptionGroups",
    basePath: "/v1/subscriptionGroups",
    fields: ["referenceName"]
  };
  reg(subGroupConfig);
  nested("/v1/apps/:appId/subscriptionGroups", subGroupConfig, "appId", "app_id");
  const subConfig = {
    type: "subscriptions",
    basePath: "/v1/subscriptions",
    fields: ["name", "productId", "subscriptionPeriod", "groupLevel", "reviewNote", "state", "familySharable"],
    relationshipStoreFields: {
      subscriptionGroup: ["group_id"]
    }
  };
  reg(subConfig);
  nested("/v1/subscriptionGroups/:groupId/subscriptions", subConfig, "groupId", "group_id");
  reg({
    type: "subscriptionPricePoints",
    basePath: "/v1/subscriptionPricePoints",
    fields: ["customerPrice", "proceeds", "proceedsYear2"],
    readOnly: true,
    noDelete: true
  });
  nested("/v1/subscriptions/:subId/pricePoints", {
    type: "subscriptionPricePoints",
    basePath: "/v1/subscriptionPricePoints",
    fields: ["customerPrice", "proceeds"]
  }, "subId", "subscription_id");
  reg({
    type: "subscriptionLocalizations",
    basePath: "/v1/subscriptionLocalizations",
    fields: ["locale", "name", "description"]
  });
  const offerCodeConfig = {
    type: "subscriptionOfferCodes",
    basePath: "/v1/subscriptionOfferCodes",
    fields: ["name", "customerEligibilities", "offerEligibility", "duration", "offerMode", "numberOfPeriods", "isActive"]
  };
  reg(offerCodeConfig);
  nested("/v1/subscriptions/:subId/offerCodes", offerCodeConfig, "subId", "subscription_id");
  const introConfig = {
    type: "subscriptionIntroductoryOffers",
    basePath: "/v1/subscriptionIntroductoryOffers",
    fields: ["duration", "offerMode", "numberOfPeriods", "startDate", "endDate"]
  };
  reg(introConfig);
  nested("/v1/subscriptions/:subId/introductoryOffers", introConfig, "subId", "subscription_id");
  const promoConfig = {
    type: "subscriptionPromotionalOffers",
    basePath: "/v1/subscriptionPromotionalOffers",
    fields: ["name", "offerCode", "duration", "offerMode", "numberOfPeriods"]
  };
  reg(promoConfig);
  nested("/v1/subscriptions/:subId/promotionalOffers", promoConfig, "subId", "subscription_id");
  reg({
    type: "subscriptionImages",
    basePath: "/v1/subscriptionImages",
    fields: ["fileSize", "fileName", "imageAsset", "assetToken"]
  });
  reg({
    type: "subscriptionGracePeriods",
    basePath: "/v1/subscriptionGracePeriods",
    fields: ["optIn", "sandboxOptIn", "duration", "renewalType"],
    readOnly: true,
    noDelete: true
  });
  reg({ type: "subscriptionGroupSubmissions", basePath: "/v1/subscriptionGroupSubmissions", fields: [] });
  reg({
    type: "subscriptionGroupLocalizations",
    basePath: "/v1/subscriptionGroupLocalizations",
    fields: ["locale", "name", "customAppName"]
  });
  reg({
    type: "sandboxTesters",
    basePath: "/v2/sandboxTesters",
    fields: ["email", "firstName", "lastName", "territory", "interruptPurchases"],
    noDelete: true
  });
  const clipConfig = {
    type: "appClips",
    basePath: "/v1/appClips",
    fields: ["bundleId"],
    readOnly: true,
    noDelete: true
  };
  reg(clipConfig);
  nested("/v1/apps/:appId/appClips", clipConfig, "appId", "app_id");
  reg({
    type: "appClipDefaultExperiences",
    basePath: "/v1/appClipDefaultExperiences",
    fields: ["action"],
    readOnly: true,
    noDelete: true
  });
  nested("/v1/appClips/:clipId/appClipDefaultExperiences", {
    type: "appClipDefaultExperiences",
    basePath: "/v1/appClipDefaultExperiences",
    fields: ["action"]
  }, "clipId", "clip_id");
  const expConfig = {
    type: "appStoreVersionExperiments",
    basePath: "/v2/appStoreVersionExperiments",
    fields: ["name", "trafficProportion", "state", "startDate", "endDate"]
  };
  reg(expConfig);
  reg({
    type: "appStoreVersionExperimentTreatments",
    basePath: "/v1/appStoreVersionExperimentTreatments",
    fields: ["name", "appIcon", "appIconName"]
  });
  app.get("/v1/salesReports", (c) => c.body("", 200));
  app.get("/v1/financeReports", (c) => c.body("", 200));
  const gcDetailConfig = {
    type: "gameCenterDetails",
    basePath: "/v1/gameCenterDetails",
    fields: ["arcadeEnabled", "challengeEnabled", "defaultLeaderboard", "defaultGroupLeaderboard"],
    readOnly: true,
    noDelete: true
  };
  reg(gcDetailConfig);
  const achConfig = {
    type: "gameCenterAchievements",
    basePath: "/v1/gameCenterAchievements",
    fields: ["referenceName", "vendorIdentifier", "points", "showBeforeEarned", "repeatable", "archived"]
  };
  reg(achConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterAchievements", achConfig, "detailId", "detail_id");
  const lbConfig = {
    type: "gameCenterLeaderboards",
    basePath: "/v1/gameCenterLeaderboards",
    fields: ["referenceName", "vendorIdentifier", "defaultFormatter", "submissionType", "scoreSortType", "archived"]
  };
  reg(lbConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterLeaderboards", lbConfig, "detailId", "detail_id");
  const lbSetConfig = {
    type: "gameCenterLeaderboardSets",
    basePath: "/v1/gameCenterLeaderboardSets",
    fields: ["referenceName", "vendorIdentifier"]
  };
  reg(lbSetConfig);
  nested("/v1/gameCenterDetails/:detailId/gameCenterLeaderboardSets", lbSetConfig, "detailId", "detail_id");
  reg({ type: "gameCenterMatchmakingQueues", basePath: "/v1/gameCenterMatchmakingQueues", fields: ["referenceName", "classicMatchmakingBundleIds"] });
  reg({ type: "gameCenterMatchmakingRuleSets", basePath: "/v1/gameCenterMatchmakingRuleSets", fields: ["referenceName", "ruleLanguageVersion", "minPlayers", "maxPlayers"] });
  reg({ type: "gameCenterMatchmakingTeams", basePath: "/v1/gameCenterMatchmakingTeams", fields: ["referenceName", "minPlayers", "maxPlayers"] });
  reg({ type: "gameCenterAchievementLocalizations", basePath: "/v1/gameCenterAchievementLocalizations", fields: ["locale", "name", "beforeEarnedDescription", "afterEarnedDescription"] });
  reg({ type: "gameCenterLeaderboardLocalizations", basePath: "/v1/gameCenterLeaderboardLocalizations", fields: ["locale", "name", "formatterOverride", "formatterSuffix", "formatterSuffixSingular"] });
  reg({ type: "gameCenterMatchmakingRules", basePath: "/v1/gameCenterMatchmakingRules", fields: ["referenceName", "description", "type", "expression", "weight"] });
  reg({
    type: "appStoreVersionPhasedReleases",
    basePath: "/v1/appStoreVersionPhasedReleases",
    fields: ["phasedReleaseState", "startDate", "totalPauseDuration", "currentDayNumber"]
  });
  reg({
    type: "territories",
    basePath: "/v1/territories",
    fields: ["currency"],
    readOnly: true,
    noDelete: true
  });
  const encConfig = {
    type: "appEncryptionDeclarations",
    basePath: "/v1/appEncryptionDeclarations",
    fields: ["usesEncryption", "isExempt", "containsProprietaryCryptography", "containsThirdPartyCryptography", "platform"],
    noDelete: true
  };
  reg(encConfig);
  nested("/v1/apps/:appId/appEncryptionDeclarations", encConfig, "appId", "app_id");
  reg({
    type: "endUserLicenseAgreements",
    basePath: "/v1/endUserLicenseAgreements",
    fields: ["agreementText"]
  });
  reg({
    type: "betaLicenseAgreements",
    basePath: "/v1/betaLicenseAgreements",
    fields: ["agreementText"],
    noDelete: true
  });
  const diagSigConfig = {
    type: "diagnosticSignatures",
    basePath: "/v1/diagnosticSignatures",
    fields: ["diagnosticType", "signature", "weight"],
    readOnly: true,
    noDelete: true
  };
  reg(diagSigConfig);
  nested("/v1/builds/:buildId/diagnosticSignatures", diagSigConfig, "buildId", "build_id");
  const wboConfig = {
    type: "winBackOffers",
    basePath: "/v1/winBackOffers",
    fields: ["referenceName", "offerId", "duration", "offerMode", "periodCount", "priority"]
  };
  reg(wboConfig);
  nested("/v1/subscriptions/:subId/winBackOffers", wboConfig, "subId", "subscription_id");
  reg({
    type: "alternativeDistributionKeys",
    basePath: "/v1/alternativeDistributionKeys",
    fields: ["publicKey"]
  });
  reg({
    type: "alternativeDistributionDomains",
    basePath: "/v1/alternativeDistributionDomains",
    fields: ["domain", "referenceName", "createdDate"]
  });
  reg({
    type: "alternativeDistributionPackageVersions",
    basePath: "/v1/alternativeDistributionPackageVersions",
    fields: ["version", "state", "url"],
    readOnly: true,
    noDelete: true
  });
  reg({
    type: "scmProviders",
    basePath: "/v1/scmProviders",
    fields: ["scmProviderType", "url"],
    readOnly: true,
    noDelete: true
  });
  const scmRepoConfig = {
    type: "scmRepositories",
    basePath: "/v1/scmRepositories",
    fields: ["httpCloneUrl", "sshCloneUrl", "ownerName", "repositoryName"],
    readOnly: true,
    noDelete: true
  };
  reg(scmRepoConfig);
  reg({
    type: "scmPullRequests",
    basePath: "/v1/scmPullRequests",
    fields: ["title", "number", "sourceBranchName", "destinationBranchName", "isClosed"],
    readOnly: true,
    noDelete: true
  });
  nested("/v1/scmRepositories/:repoId/pullRequests", {
    type: "scmPullRequests",
    basePath: "/v1/scmPullRequests",
    fields: ["title", "number", "sourceBranchName", "destinationBranchName"]
  }, "repoId", "repository_id");
  reg({
    type: "scmGitReferences",
    basePath: "/v1/scmGitReferences",
    fields: ["name", "canonicalName", "kind"],
    readOnly: true,
    noDelete: true
  });
  nested("/v1/scmRepositories/:repoId/gitReferences", {
    type: "scmGitReferences",
    basePath: "/v1/scmGitReferences",
    fields: ["name", "canonicalName", "kind"]
  }, "repoId", "repository_id");
  reg({
    type: "territoryAvailabilities",
    basePath: "/v1/territoryAvailabilities",
    fields: ["available", "contentStatuses", "preOrderEnabled", "releaseDate"],
    noDelete: true
  });
  const eventConfig = {
    type: "appEvents",
    basePath: "/v1/appEvents",
    fields: ["referenceName", "badge", "deepLink", "purchaseRequirement", "primaryLocale", "priority", "purpose", "eventState", "archivedTerritorySchedules"]
  };
  reg(eventConfig);
  nested("/v1/apps/:appId/appEvents", eventConfig, "appId", "app_id");
  reg({
    type: "appEventLocalizations",
    basePath: "/v1/appEventLocalizations",
    fields: ["locale", "name", "shortDescription", "longDescription"]
  });
  const bundleConfig = {
    type: "buildBundles",
    basePath: "/v1/buildBundles",
    fields: ["bundleId", "bundleType", "sdkBuild", "platformBuild", "fileName", "hasSirikit", "hasOnDemandResources", "hasPrerenderedIcon", "usesLocationServices", "isNewsstandApp", "includesSymbols"],
    readOnly: true,
    noDelete: true
  };
  reg(bundleConfig);
  nested("/v1/builds/:buildId/buildBundles", bundleConfig, "buildId", "build_id");
  reg({
    type: "appPricePoints",
    basePath: "/v1/appPricePoints",
    fields: ["customerPrice", "proceeds"],
    readOnly: true,
    noDelete: true
  });
  reg({
    type: "appPriceSchedules",
    basePath: "/v1/appPriceSchedules",
    fields: ["baseTerritory"],
    readOnly: true,
    noDelete: true
  });
  reg({ type: "crashSubmissions", basePath: "/v1/crashSubmissions", fields: ["reportType", "deviceModel", "osVersion"], readOnly: true, noDelete: true });
  reg({ type: "screenshotSubmissions", basePath: "/v1/screenshotSubmissions", fields: ["reportType", "deviceModel", "osVersion"], readOnly: true, noDelete: true });
  reg({
    type: "appCategories",
    basePath: "/v1/appCategories",
    fields: ["platforms"],
    readOnly: true,
    noDelete: true
  });
  reg({
    type: "ageRatingDeclarations",
    basePath: "/v1/ageRatingDeclarations",
    fields: ["alcoholTobaccoOrDrugUseOrReferences", "gamblingAndContests", "horrorOrFearThemes", "matureOrSuggestiveThemes", "medicalOrTreatmentInformation", "profanityOrCrudeHumor", "sexualContentGraphicAndNudity", "sexualContentOrNudity", "violenceCartoonOrFantasy", "violenceRealistic", "violenceRealisticProlongedGraphicOrSadistic"],
    noDelete: true
  });
  app.get("/v1/apps/:appId/perfPowerMetrics", (c) => c.json({ productData: [] }));
  app.get("/v1/builds/:buildId/perfPowerMetrics", (c) => c.json({ productData: [] }));
  const ppConfig = {
    type: "promotedPurchases",
    basePath: "/v1/promotedPurchases",
    fields: ["visibleForAllUsers", "enabled", "state"]
  };
  reg(ppConfig);
  nested("/v1/apps/:appId/promotedPurchases", ppConfig, "appId", "app_id");
  reg({
    type: "merchantIds",
    basePath: "/v1/merchantIds",
    fields: ["name", "identifier"]
  });
  reg({
    type: "passTypeIds",
    basePath: "/v1/passTypeIds",
    fields: ["name", "identifier"]
  });
  const mappingConfig = {
    type: "androidToIosMappings",
    basePath: "/v1/androidToIosMappings",
    fields: ["packageName", "sha256Fingerprints"]
  };
  reg(mappingConfig);
  nested("/v1/apps/:appId/androidToIosMappings", mappingConfig, "appId", "app_id");
  const whConfig = {
    type: "appStoreConnectWebhooks",
    basePath: "/v1/appStoreConnectWebhooks",
    fields: ["name", "url", "eventTypes", "isEnabled", "secret"]
  };
  reg(whConfig);
  nested("/v1/apps/:appId/appStoreConnectWebhooks", whConfig, "appId", "app_id");
  const baConfig = {
    type: "backgroundAssets",
    basePath: "/v1/backgroundAssets",
    fields: ["assetPackIdentifier", "isArchived"]
  };
  reg(baConfig);
  nested("/v1/apps/:appId/backgroundAssets", baConfig, "appId", "app_id");
  const accConfig = {
    type: "accessibilityDeclarations",
    basePath: "/v1/accessibilityDeclarations",
    fields: ["isPublish", "supportsAudioDescriptions", "supportsCaptions", "supportsDarkInterface", "supportsDifferentiateWithoutColorAlone", "supportsLargerText", "supportsReducedMotion", "supportsSufficientContrast", "supportsVoiceControl", "supportsVoiceover"],
    noDelete: true
  };
  reg(accConfig);
  nested("/v1/apps/:appId/accessibilityDeclarations", accConfig, "appId", "app_id");
  reg({
    type: "betaRecruitmentCriteria",
    basePath: "/v1/betaRecruitmentCriteria",
    fields: ["deviceFamilyOsVersionFilters"]
  });
  reg({
    type: "betaRecruitmentCriterionOptions",
    basePath: "/v1/betaRecruitmentCriterionOptions",
    fields: ["deviceFamily", "osVersion"],
    readOnly: true,
    noDelete: true
  });
  reg({
    type: "nominations",
    basePath: "/v1/nominations",
    fields: ["name", "type", "description"]
  });
  reg({
    type: "marketplaceSearchDetails",
    basePath: "/v1/marketplaceSearchDetails",
    fields: ["catalogUrl"]
  });
  reg({
    type: "marketplaceWebhooks",
    basePath: "/v1/marketplaceWebhooks",
    fields: ["endpointUrl", "secret"]
  });
  reg({
    type: "routingAppCoverages",
    basePath: "/v1/routingAppCoverages",
    fields: ["fileName", "fileSize", "sourceFileChecksum", "assetDeliveryState"]
  });
  reg({
    type: "submissions",
    basePath: "/notary/v2/submissions",
    fields: ["submissionName", "sha256", "status", "createdDate"]
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/itunes.ts
function getApps(store) {
  return store.getData("itunes.apps") ?? [];
}
function searchApps(apps, term, limit) {
  const lower = term.toLowerCase();
  const matched = apps.filter(
    (a) => a.trackName.toLowerCase().includes(lower) || a.bundleId.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower)
  );
  return matched.slice(0, limit);
}
function itunesResponse(results) {
  return { resultCount: results.length, results };
}
function itunesRoutes({ app, store }) {
  app.get("/search", (c) => {
    const term = c.req.query("term") ?? "";
    const limit = parseInt(c.req.query("limit") ?? "10", 10);
    const results = searchApps(getApps(store), term, limit);
    return c.json(itunesResponse(results));
  });
  app.get("/lookup", (c) => {
    const id = c.req.query("id") ?? "";
    const apps = getApps(store);
    const found = apps.filter((a) => String(a.trackId) === id);
    return c.json(itunesResponse(found));
  });
  app.get("/v1/app-store/search", (c) => {
    const term = c.req.query("term") ?? "";
    const limit = parseInt(c.req.query("limit") ?? "10", 10);
    const results = searchApps(getApps(store), term, limit);
    return c.json(itunesResponse(results));
  });
  app.get("/v1/app-store/lookup", (c) => {
    const appId = c.req.query("appId") ?? "";
    const apps = getApps(store);
    const found = apps.filter((a) => String(a.trackId) === appId);
    return c.json(itunesResponse(found));
  });
  app.get("/v1/app-store/storefront", (c) => {
    const appId = c.req.query("appId") ?? "";
    const apps = getApps(store);
    const found = apps.find((a) => String(a.trackId) === appId);
    if (!found || found.screenshotUrls.length === 0) {
      return c.html("<html><body></body></html>");
    }
    const pictures = found.screenshotUrls.map((url) => `<picture><source srcset="${url} 460w"></picture>`).join("\n");
    return c.html(`<html><body><section id="product_media_screenshots">${pictures}</section><div class="platform-description"></div></body></html>`);
  });
  app.get("/:store/app/id:appId", (c) => {
    const appId = c.req.param("appId");
    const apps = getApps(store);
    const found = apps.find((a) => String(a.trackId) === appId);
    if (!found) {
      return c.html("<html><body></body></html>");
    }
    const pictures = found.screenshotUrls.map((url) => `<picture><source srcset="${url} 460w"></picture>`).join("\n");
    return c.html(`<html><body><section id="product_media_screenshots">${pictures}</section><div class="platform-description"></div></body></html>`);
  });
}
function seedITunes(store, config) {
  if (config.apps) {
    const apps = config.apps.map((a) => ({
      trackId: a.trackId,
      trackName: a.trackName,
      bundleId: a.bundleId,
      sellerName: a.sellerName ?? "",
      primaryGenreName: a.primaryGenreName ?? "Utilities",
      averageUserRating: a.averageUserRating ?? 4.5,
      userRatingCount: a.userRatingCount ?? 100,
      description: a.description ?? "",
      screenshotUrls: a.screenshotUrls ?? [],
      ipadScreenshotUrls: [],
      appletvScreenshotUrls: [],
      supportedDevices: ["iPhone", "iPad"]
    }));
    store.setData("itunes.apps", apps);
  }
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/admin.ts
function adminRoutes({ app, store, baseUrl }) {
  const asc = getASCStore(store);
  app.post("/_admin/reset", (c) => {
    for (const item of asc.apps.all()) asc.apps.delete(item.id);
    for (const item of asc.builds.all()) asc.builds.delete(item.id);
    for (const item of asc.versions.all()) asc.versions.delete(item.id);
    for (const item of asc.reviewSubmissions.all()) asc.reviewSubmissions.delete(item.id);
    for (const item of asc.localizations.all()) asc.localizations.delete(item.id);
    store.setData("asc.review_scenario", "approve");
    store.setData("asc.rejection_reasons", ["METADATA_REJECTED"]);
    store.setData("asc.reviewer_notes", null);
    store.setData("asc.customer_reviews", []);
    store.setData("asc.review_responses", []);
    store.setData("asc.ci_products", []);
    store.setData("asc.ci_workflows", []);
    store.setData("asc.ci_build_runs", []);
    store.setData("asc.beta_groups", []);
    store.setData("asc.beta_testers", []);
    store.setData("asc.beta_build_localizations", []);
    store.setData("asc.users", []);
    store.setData("asc.actors", []);
    store.setData("asc.uploads", []);
    store.setData("asc.review_submission_items", []);
    store.setData("asc.review_attachments", []);
    store.setData("asc.app_info_localizations", []);
    store.setData("asc.analytics_snapshot", null);
    store.setData("itunes.apps", []);
    store.setData("asc.apns_notifications", []);
    const crudTypes = [
      "certificates",
      "profiles",
      "devices",
      "bundleIds",
      "appScreenshotSets",
      "appScreenshots",
      "appPreviewSets",
      "appPreviews",
      "appCustomProductPages",
      "appCustomProductPageVersions",
      "inAppPurchases",
      "inAppPurchaseImages",
      "inAppPurchasePriceSchedules",
      "inAppPurchaseAvailabilities",
      "inAppPurchaseSubmissions",
      "subscriptionGroups",
      "subscriptions",
      "subscriptionPricePoints",
      "subscriptionLocalizations",
      "subscriptionOfferCodes",
      "subscriptionIntroductoryOffers",
      "subscriptionPromotionalOffers",
      "subscriptionImages",
      "subscriptionGracePeriods",
      "subscriptionGroupSubmissions",
      "subscriptionGroupLocalizations",
      "sandboxTesters",
      "appClips",
      "appClipDefaultExperiences",
      "appStoreVersionExperiments",
      "appStoreVersionExperimentTreatments",
      "gameCenterDetails",
      "gameCenterAchievements",
      "gameCenterLeaderboards",
      "gameCenterLeaderboardSets",
      "gameCenterMatchmakingQueues",
      "gameCenterMatchmakingRuleSets",
      "gameCenterMatchmakingTeams",
      "gameCenterAchievementLocalizations",
      "gameCenterLeaderboardLocalizations",
      "gameCenterMatchmakingRules",
      "appStoreVersionPhasedReleases",
      "territories",
      "appEncryptionDeclarations",
      "endUserLicenseAgreements",
      "betaLicenseAgreements",
      "diagnosticSignatures",
      "winBackOffers",
      "alternativeDistributionKeys",
      "alternativeDistributionDomains",
      "alternativeDistributionPackageVersions",
      "scmProviders",
      "scmRepositories",
      "scmPullRequests",
      "scmGitReferences",
      "territoryAvailabilities",
      "appEvents",
      "appEventLocalizations",
      "buildBundles",
      "appPricePoints",
      "appPriceSchedules",
      "crashSubmissions",
      "screenshotSubmissions",
      "appCategories",
      "ageRatingDeclarations",
      "promotedPurchases",
      "merchantIds",
      "passTypeIds",
      "androidToIosMappings",
      "appStoreConnectWebhooks",
      "backgroundAssets",
      "accessibilityDeclarations",
      "betaRecruitmentCriteria",
      "betaRecruitmentCriterionOptions",
      "nominations",
      "marketplaceSearchDetails",
      "marketplaceWebhooks",
      "routingAppCoverages",
      "submissions"
    ];
    for (const t of crudTypes) {
      store.setData(`asc.crud.${t}`, []);
    }
    return c.json({ ok: true });
  });
  app.post("/_admin/seed", async (c) => {
    const config = await c.req.json();
    seedFromConfig(store, baseUrl, config);
    if (config.ci_products) store.setData("asc.ci_products", config.ci_products);
    if (config.ci_workflows) store.setData("asc.ci_workflows", config.ci_workflows);
    if (config.ci_build_runs) store.setData("asc.ci_build_runs", config.ci_build_runs);
    if (config.beta_groups) store.setData("asc.beta_groups", config.beta_groups);
    if (config.beta_testers) store.setData("asc.beta_testers", config.beta_testers);
    if (config.users) store.setData("asc.users", config.users);
    if (config.actors) store.setData("asc.actors", config.actors);
    if (config.customer_reviews) store.setData("asc.customer_reviews", config.customer_reviews);
    if (config.analytics_snapshot) store.setData("asc.analytics_snapshot", config.analytics_snapshot);
    if (config.itunes) seedITunes(store, config.itunes);
    return c.json({ ok: true });
  });
  app.post("/_admin/scenario", async (c) => {
    const body = await c.req.json();
    if (body.review_scenario) {
      store.setData("asc.review_scenario", body.review_scenario);
    }
    if (body.rejection_reasons) {
      store.setData("asc.rejection_reasons", body.rejection_reasons);
    }
    if (body.reviewer_notes !== void 0) {
      store.setData("asc.reviewer_notes", body.reviewer_notes);
    }
    return c.json({ ok: true });
  });
  app.get("/_admin/health", (c) => c.json({ ok: true, service: "asc" }));
  app.get("/inspect/asc/state", (c) => c.json({
    apps: asc.apps.all(),
    builds: asc.builds.all(),
    versions: asc.versions.all(),
    reviewSubmissions: asc.reviewSubmissions.all(),
    localizations: asc.localizations.all(),
    uploads: store.getData("asc.uploads") ?? [],
    buildUploads: store.getData("asc.build_uploads") ?? [],
    buildUploadFiles: store.getData("asc.build_upload_files") ?? [],
    uploadChunks: store.getData("asc.upload_chunks") ?? {}
  }));
  app.get("/inspect/last-sign-sap-setup", (c) => c.json(store.getData("apple:last-sign-sap-setup") ?? null));
  app.get("/inspect/last-sign-sap-setup-response", (c) => c.json(store.getData("apple:last-sign-sap-setup-response") ?? null));
  app.get("/inspect/last-signin", (c) => c.json(store.getData("apple:last-signin") ?? null));
}

// ../api-emulator-plugins/@apple/api-emulator/src/routes/apns.ts
var APNS_FAILURE_REASONS = /* @__PURE__ */ new Set([
  "BadDeviceToken",
  "BadExpirationDate",
  "BadPriority",
  "BadPushType",
  "BadTopic",
  "ExpiredProviderToken",
  "Forbidden",
  "DeviceTokenNotForTopic",
  "InvalidProviderToken",
  "PayloadEmpty",
  "TopicDisallowed",
  "TooManyRequests",
  "Unregistered"
]);
function now2() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function apnsState(store) {
  const current = store.getData("apple:apns-state");
  if (current) return current;
  const initial = {
    teams: {},
    keys: {},
    devices: {},
    topics: {},
    collapsed: {},
    pending: [],
    throttles: {}
  };
  store.setData("apple:apns-state", initial);
  return initial;
}
function saveApnsState(store, state) {
  store.setData("apple:apns-state", state);
}
function apnsDeliveries(store) {
  return store.getData("apple:apns-deliveries") ?? [];
}
function saveApnsDelivery(store, delivery) {
  const deliveries = [delivery, ...apnsDeliveries(store)];
  store.setData("apple:apns-deliveries", deliveries);
  store.setData("apple:apns-last-delivery", delivery);
  store.setData("asc.apns_notifications", deliveries.map((item) => ({
    id: item.id,
    token: item.deviceToken,
    topic: item.topic,
    push_type: item.headers["apns-push-type"] ?? null,
    priority: item.headers["apns-priority"] ?? null,
    payload: item.payload,
    received_at: item.receivedAt
  })));
}
function apnsFailures(store) {
  return store.getData("apple:apns-failures") ?? {};
}
function readExpiration(value) {
  if (!value || value === "0") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}
function validationFailure(reason, status) {
  return { reason, status };
}
function validateApnsRequest(store, request) {
  const state = apnsState(store);
  const topic = request.headers["apns-topic"];
  const pushType = request.headers["apns-push-type"];
  const priority = request.headers["apns-priority"];
  const teamId = request.headers["apns-team-id"];
  const keyId = request.headers["apns-key-id"];
  const device = state.devices[request.token];
  if (request.expiresAt === "invalid") return validationFailure("BadExpirationDate", 400);
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) return validationFailure("BadPayload", 400);
  if (topic && Object.keys(state.topics).length > 0 && !state.topics[topic]) return validationFailure("BadTopic", 400);
  if (device?.status === "unregistered") return validationFailure("Unregistered", 410);
  if (device && topic && device.topic !== topic) return validationFailure("DeviceTokenNotForTopic", 400);
  if (pushType && !["alert", "background", "voip", "complication", "fileprovider", "mdm", "liveactivity"].includes(pushType)) return validationFailure("BadPushType", 400);
  if (priority && !["5", "10"].includes(priority)) return validationFailure("BadPriority", 400);
  if (teamId && Object.keys(state.teams).length > 0 && !state.teams[teamId]) return validationFailure("Forbidden", 403);
  if (keyId && teamId && Object.keys(state.keys).length > 0 && !state.keys[`${teamId}:${keyId}`]) return validationFailure("InvalidProviderToken", 403);
  if (state.throttles[request.token] || topic && state.throttles[topic]) return validationFailure("TooManyRequests", 429);
  return null;
}
function createDelivery(input) {
  const topic = input.headers["apns-topic"] ?? "";
  return {
    id: input.headers["apns-id"] ?? crypto.randomUUID(),
    deviceToken: input.token,
    topic,
    payload: input.payload,
    headers: input.headers,
    receivedAt: now2(),
    expiresAt: input.expiresAt,
    collapseId: input.headers["apns-collapse-id"] ?? null
  };
}
function enqueueOrDeliver(store, delivery) {
  const state = apnsState(store);
  const device = state.devices[delivery.deviceToken];
  if (device?.status === "offline") {
    if (delivery.collapseId) state.collapsed[`${delivery.deviceToken}:${delivery.collapseId}`] = delivery;
    else state.pending.push(delivery);
    saveApnsState(store, state);
    return { queued: true, delivery };
  }
  saveApnsDelivery(store, { ...delivery, deliveredAt: now2() });
  return { queued: false, delivery };
}
function flushPendingDeliveries(store, token) {
  const state = apnsState(store);
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const collapsed = Object.values(state.collapsed);
  state.collapsed = {};
  const pending = [...state.pending, ...collapsed];
  const deliverable = [];
  const retained = [];
  for (const item of pending) {
    if (token && item.deviceToken !== token) {
      retained.push(item);
      continue;
    }
    if (item.expiresAt && item.expiresAt <= nowSeconds) continue;
    deliverable.push({ ...item, deliveredAt: now2() });
  }
  state.pending = retained;
  saveApnsState(store, state);
  for (const delivery of deliverable) saveApnsDelivery(store, delivery);
  return deliverable;
}
function parseLimit(value) {
  if (!value) return 50;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 500);
}
async function parseBody(c) {
  return c.req.json().catch(() => null);
}
function apnsRoutes({ app, store }) {
  app.post("/3/device/:token", async (c) => {
    const token = c.req.param("token");
    const headers = {
      "apns-id": c.req.header("apns-id"),
      "apns-topic": c.req.header("apns-topic"),
      "apns-push-type": c.req.header("apns-push-type"),
      "apns-collapse-id": c.req.header("apns-collapse-id"),
      "apns-priority": c.req.header("apns-priority"),
      "apns-expiration": c.req.header("apns-expiration"),
      "apns-team-id": c.req.header("apns-team-id"),
      "apns-key-id": c.req.header("apns-key-id"),
      authorization: c.req.header("authorization")
    };
    const payload = await parseBody(c);
    const expiresAt = readExpiration(headers["apns-expiration"]);
    const failure = apnsFailures(store)[token] ?? apnsFailures(store)["*"] ?? validateApnsRequest(store, { token, payload, headers, expiresAt });
    if (failure) return c.json({ reason: failure.reason }, failure.status);
    const delivery = createDelivery({ token, payload, headers, expiresAt: expiresAt === "invalid" ? null : expiresAt });
    enqueueOrDeliver(store, delivery);
    c.header("apns-id", delivery.id);
    return c.body(null, 200);
  });
  app.post("/apns/send", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const token = body.deviceToken ?? "";
    const headers = {
      "apns-id": crypto.randomUUID(),
      "apns-topic": body.topic,
      "apns-push-type": body.pushType,
      "apns-collapse-id": body.collapseId,
      "apns-priority": body.priority === void 0 ? void 0 : String(body.priority),
      "apns-expiration": body.expiration === void 0 ? void 0 : String(body.expiration),
      "apns-team-id": body.teamId,
      "apns-key-id": body.keyId,
      authorization: void 0
    };
    const expiresAt = readExpiration(headers["apns-expiration"]);
    const failure = apnsFailures(store)[token] ?? apnsFailures(store)["*"] ?? validateApnsRequest(store, {
      token,
      payload: body.payload,
      headers,
      expiresAt
    });
    if (failure) return c.json({ reason: failure.reason }, failure.status);
    const delivery = createDelivery({ token, payload: body.payload, headers, expiresAt: expiresAt === "invalid" ? null : expiresAt });
    const result = enqueueOrDeliver(store, delivery);
    return c.json({ ok: true, queued: result.queued, delivery });
  });
  app.post("/apns/control/register-team", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.teamId) return c.json({ error: "teamId required" }, 400);
    const state = apnsState(store);
    state.teams[body.teamId] = { teamId: body.teamId };
    saveApnsState(store, state);
    return c.json(state.teams[body.teamId]);
  });
  app.post("/apns/control/register-key", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.teamId || !body.keyId) return c.json({ error: "teamId and keyId required" }, 400);
    const state = apnsState(store);
    state.keys[`${body.teamId}:${body.keyId}`] = { teamId: body.teamId, keyId: body.keyId };
    saveApnsState(store, state);
    return c.json(state.keys[`${body.teamId}:${body.keyId}`]);
  });
  app.post("/apns/control/register-topic", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.topic) return c.json({ error: "topic required" }, 400);
    const state = apnsState(store);
    state.topics[body.topic] = { topic: body.topic };
    saveApnsState(store, state);
    return c.json(state.topics[body.topic]);
  });
  app.post("/apns/control/register-device", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.deviceToken || !body.topic) return c.json({ error: "deviceToken and topic required" }, 400);
    const state = apnsState(store);
    state.devices[body.deviceToken] = { token: body.deviceToken, topic: body.topic, status: body.status ?? "registered" };
    saveApnsState(store, state);
    return c.json(state.devices[body.deviceToken]);
  });
  app.post("/apns/control/unregister-device", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.deviceToken) return c.json({ error: "deviceToken required" }, 400);
    const state = apnsState(store);
    const device = state.devices[body.deviceToken] ?? { token: body.deviceToken, topic: "", status: "registered" };
    device.status = "unregistered";
    state.devices[body.deviceToken] = device;
    saveApnsState(store, state);
    return c.json(device);
  });
  app.post("/apns/control/set-device-status", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.deviceToken || !body.status) return c.json({ error: "deviceToken and status required" }, 400);
    const state = apnsState(store);
    const device = state.devices[body.deviceToken];
    if (!device) return c.json({ error: "device not registered" }, 404);
    device.status = body.status;
    saveApnsState(store, state);
    const flushed = body.status === "registered" ? flushPendingDeliveries(store, body.deviceToken) : [];
    return c.json({ device, flushed });
  });
  app.post("/apns/control/throttle", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.key) return c.json({ error: "key required" }, 400);
    const state = apnsState(store);
    if (body.enabled === false) delete state.throttles[body.key];
    else state.throttles[body.key] = true;
    saveApnsState(store, state);
    return c.json({ key: body.key, enabled: state.throttles[body.key] === true });
  });
  app.post("/apns/control/flush-pending", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return c.json({ flushed: flushPendingDeliveries(store, body.deviceToken) });
  });
  app.post("/apns/control/fail", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.reason || !APNS_FAILURE_REASONS.has(body.reason)) return c.json({ error: "valid reason required" }, 400);
    const failures = apnsFailures(store);
    failures[body.deviceToken ?? "*"] = { reason: body.reason, status: body.status ?? 400 };
    store.setData("apple:apns-failures", failures);
    return c.json(failures);
  });
  app.post("/apns/control/reset", (c) => {
    store.setData("apple:apns-state", void 0);
    store.setData("apple:apns-deliveries", []);
    store.setData("apple:apns-last-delivery", null);
    store.setData("apple:apns-failures", {});
    store.setData("asc.apns_notifications", []);
    return c.json({ ok: true });
  });
  app.get("/inspect/apns/state", (c) => c.json(apnsState(store)));
  app.get("/inspect/apns/collapsed", (c) => c.json(apnsState(store).collapsed));
  app.get("/inspect/apns/pending", (c) => c.json(apnsState(store).pending));
  app.get("/inspect/apns/unregistered", (c) => c.json(Object.values(apnsState(store).devices).filter((device) => device.status === "unregistered")));
  app.get("/inspect/apns/deliveries", (c) => c.json(apnsDeliveries(store)));
  app.get("/inspect/apns/last-delivery", (c) => c.json(store.getData("apple:apns-last-delivery") ?? null));
  app.get("/inspect/apns/failures", (c) => c.json(apnsFailures(store)));
  app.get("/inspect/apns/notifications", (c) => {
    const limit = parseLimit(c.req.query("limit"));
    const token = c.req.query("token");
    const notifications = (store.getData("asc.apns_notifications") ?? []).filter((notification) => !token || notification.token === token).slice(0, limit);
    return c.json({ data: notifications, meta: { limit, total: notifications.length } });
  });
}

// ../api-emulator-plugins/@apple/api-emulator/src/index.ts
var contract = {
  provider: "apple",
  source: "Apple APNs provider API documentation and App Store Connect API JSON:API conventions",
  docs: "https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns",
  scope: [
    "ams-auth",
    "apns-auth",
    "teams",
    "keys",
    "topics",
    "device-tokens",
    "notifications",
    "asc-apps",
    "asc-build-uploads",
    "asc-builds",
    "asc-testflight",
    "asc-review-submissions",
    "asc-xcode-cloud",
    "asc-metadata",
    "asc-readiness"
  ],
  fidelity: "resource-model-subset"
};
function seedDefaults(store, _baseUrl) {
  const asc = getASCStore(store);
  asc.apps.insert({
    asc_id: "1234567890",
    name: "My App",
    bundle_id: "com.example.app",
    primary_locale: "en-US"
  });
  store.setData("asc.review_scenario", "approve");
  store.setData("asc.rejection_reasons", ["METADATA_REJECTED"]);
  store.setData("asc.reviewer_notes", null);
}
function seedFromConfig(store, _baseUrl, config) {
  const asc = getASCStore(store);
  if (config.apps) {
    for (const a of config.apps) {
      const existing = asc.apps.findOneBy("bundle_id", a.bundle_id);
      if (existing) continue;
      asc.apps.insert({
        asc_id: a.id ?? ascId(),
        name: a.name,
        bundle_id: a.bundle_id,
        primary_locale: a.primary_locale ?? "en-US"
      });
    }
  }
  if (config.builds) {
    for (const b of config.builds) {
      asc.builds.insert({
        asc_id: b.id ?? ascId(),
        app_id: b.app_id,
        version: b.version,
        processing_state: b.processing_state ?? "VALID",
        is_expired: b.is_expired ?? false
      });
    }
  }
  if (config.versions) {
    for (const v of config.versions) {
      asc.versions.insert({
        asc_id: v.id ?? ascId(),
        app_id: v.app_id,
        version_string: v.version_string,
        platform: v.platform ?? "IOS",
        app_store_state: v.app_store_state ?? "PREPARE_FOR_SUBMISSION"
      });
    }
  }
  if (config.review_scenario) {
    store.setData("asc.review_scenario", config.review_scenario);
  }
  if (config.rejection_reasons) {
    store.setData("asc.rejection_reasons", config.rejection_reasons);
  }
  if (config.reviewer_notes !== void 0) {
    store.setData("asc.reviewer_notes", config.reviewer_notes);
  }
}
var plugin = {
  name: "apple",
  register(app, store, webhooks = { dispatch: () => {
  }, subscribe: () => () => {
  } }, baseUrl = "", tokenMap) {
    const ctx = { app, store, webhooks, baseUrl, tokenMap };
    reviewSubmissionRoutes(ctx);
    authRoutes(ctx);
    reviewRoutes(ctx);
    xcodeCloudRoutes(ctx);
    testflightRoutes(ctx);
    uploadRoutes(ctx);
    analyticsRoutes(ctx);
    appRoutes(ctx);
    metadataRoutes(ctx);
    reviewDetailRoutes(ctx);
    reviewItemRoutes(ctx);
    stubRoutes(ctx);
    adminRoutes(ctx);
    itunesRoutes(ctx);
    apnsRoutes(ctx);
  },
  seed(store, baseUrl) {
    seedDefaults(store, baseUrl);
  }
};
var ascPlugin = plugin;
var index_default = plugin;
var label = "Apple AMS auth, APNS, and App Store Connect emulator";
var endpoints = "apps, builds, versions, reviewSubmissions, customerReviews, users, ciProducts, ciWorkflows, ciBuildRuns, betaGroups, betaTesters, uploads, analytics, localizations, reviewDetails, certificates, profiles, screenshots, devices, subscriptions, gameCenter, local APNS, and 30+ more";
var capabilities = contract.scope;
var initConfig = {
  apple: {
    emulatorBaseUrl: "same emulator origin",
    apnsProxyPath: "/apns/send",
    apnsDevicePath: "/3/device/:deviceToken",
    ascBaseUrlEnv: "ASC_API_BASE_URL",
    apps: [{ id: "1234567890", name: "My App", bundle_id: "com.example.app" }],
    review_scenario: "approve"
  }
};
export {
  ascPlugin,
  capabilities,
  contract,
  index_default as default,
  endpoints,
  getASCStore,
  initConfig,
  label,
  plugin,
  seedFromConfig
};
