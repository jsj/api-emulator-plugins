import type { RouteContext, Store } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "../jsonapi.js";

interface CiProduct {
  id: string;
  name: string;
  product_type: string;
}

interface CiWorkflow {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  is_locked_for_editing: boolean;
}

interface CiBuildRun {
  id: string;
  workflow_id: string;
  number: number;
  execution_progress: string;
  completion_status: string | null;
  source_commit_sha: string | null;
  destination_branch: string | null;
  started_date: string | null;
  finished_date: string | null;
}

function getProducts(store: Store): CiProduct[] {
  return store.getData<CiProduct[]>("asc.ci_products") ?? [];
}

function getWorkflows(store: Store): CiWorkflow[] {
  return store.getData<CiWorkflow[]>("asc.ci_workflows") ?? [];
}

function getBuildRuns(store: Store): CiBuildRun[] {
  return store.getData<CiBuildRun[]>("asc.ci_build_runs") ?? [];
}

function setBuildRuns(store: Store, runs: CiBuildRun[]): void {
  store.setData("asc.ci_build_runs", runs);
}

export function xcodeCloudRoutes({ app, store, baseUrl }: RouteContext): void {
  // List CI products
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
          attributes: { name: p.name, productType: p.product_type },
        })),
        cursor,
        limit,
        products.length,
      ),
    );
  });

  // Get CI product
  app.get("/v1/ciProducts/:id", (c) => {
    const id = c.req.param("id");
    const product = getProducts(store).find((p) => p.id === id);
    if (!product) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `CiProduct ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, "ciProducts", product.id, { name: product.name, productType: product.product_type }));
  });

  // List workflows for a product
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
            isLockedForEditing: w.is_locked_for_editing,
          },
        })),
        cursor,
        limit,
        workflows.length,
      ),
    );
  });

  // Get workflow
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
        isLockedForEditing: workflow.is_locked_for_editing,
      }),
    );
  });

  // List build runs for a workflow
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
            finishedDate: r.finished_date,
          },
        })),
        cursor,
        limit,
        runs.length,
      ),
    );
  });

  // Get build run
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
        finishedDate: run.finished_date,
      }),
    );
  });

  // Start (trigger) a build run
  app.post("/v1/ciBuildRuns", async (c) => {
    const body = await parseJsonApiBody(c);
    const workflowRel = body.relationships?.workflow;
    const workflowId = workflowRel?.data?.id ?? "";

    if (!workflowId) {
      return c.json(jsonApiError(422, "INVALID_INPUT", "Invalid Input", "Missing workflow relationship"), 422);
    }

    const run: CiBuildRun = {
      id: ascId(),
      workflow_id: workflowId,
      number: getBuildRuns(store).length + 1,
      execution_progress: "COMPLETE",
      completion_status: "SUCCEEDED",
      source_commit_sha: null,
      destination_branch: null,
      started_date: new Date().toISOString(),
      finished_date: new Date().toISOString(),
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
        finishedDate: run.finished_date,
      }),
      201,
    );
  });

  // Build actions for a run
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
              completionStatus: "SUCCEEDED",
            },
          },
        ],
        0,
        50,
        1,
      ),
    );
  });

  // Artifacts for a build action
  app.get("/v1/ciBuildActions/:actionId/artifacts", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciArtifacts",
        [
          {
            id: `artifact-${actionId}`,
            attributes: { fileName: "App.ipa", fileSize: 1024, fileType: "ARCHIVE" },
          },
        ],
        0,
        50,
        1,
      ),
    );
  });

  // Test results for a build action
  app.get("/v1/ciBuildActions/:actionId/testResults", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciTestResults",
        [
          {
            id: `test-${actionId}`,
            attributes: { className: "AppTests", name: "testExample", status: "SUCCESS" },
          },
        ],
        0,
        50,
        1,
      ),
    );
  });

  // Issues for a build action
  app.get("/v1/ciBuildActions/:actionId/issues", (c) => {
    const actionId = c.req.param("actionId");
    return c.json(
      jsonApiList(
        baseUrl,
        "ciIssues",
        [
          {
            id: `issue-${actionId}`,
            attributes: { issueType: "WARNING", message: "Unused variable" },
          },
        ],
        0,
        50,
        1,
      ),
    );
  });

  // macOS versions
  app.get("/v1/ciMacOsVersions", (c) => {
    return c.json(
      jsonApiList(
        baseUrl,
        "ciMacOsVersions",
        [{ id: "macos-1", attributes: { version: "14.0", name: "macOS Sonoma" } }],
        0,
        50,
        1,
      ),
    );
  });

  // Xcode versions
  app.get("/v1/ciXcodeVersions", (c) => {
    return c.json(
      jsonApiList(
        baseUrl,
        "ciXcodeVersions",
        [{ id: "xcode-1", attributes: { version: "15.0", name: "Xcode 15" } }],
        0,
        50,
        1,
      ),
    );
  });
}
