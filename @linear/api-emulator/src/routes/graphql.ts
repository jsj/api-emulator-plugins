import type { RouteContext } from "@api-emulator/core";
import { graphql } from "graphql";
import { linearFieldResolver } from "../resolvers.js";
import { linearSchema } from "../schema.js";
import { getLinearStore } from "../store.js";

interface GraphQLRequestBody {
  query?: unknown;
  variables?: unknown;
  operationName?: unknown;
}

function tokenFromHeader(value: string | undefined): string | null {
  if (!value) return null;
  const token = value.replace(/^(Bearer|token)\s+/i, "").trim();
  return token || null;
}

function errorPayload(message: string, code: string, type: string) {
  return { data: null, errors: [{ message, extensions: { code, type } }] };
}

export function graphqlRoutes(ctx: RouteContext): void {
  const { app, store } = ctx;

  app.post("/graphql", async (c) => {
    const token = tokenFromHeader(c.req.header("Authorization"));
    if (!token || !getLinearStore(store).apiKeys.findOneBy("key", token)) {
      return c.json(errorPayload("Authentication required", "AUTHENTICATION_ERROR", "authentication error"), 401);
    }

    let body: GraphQLRequestBody;
    try {
      body = (await c.req.json()) as GraphQLRequestBody;
    } catch {
      return c.json(errorPayload("Request body must be JSON", "BAD_REQUEST", "request error"), 400);
    }

    if (typeof body.query !== "string") {
      return c.json(errorPayload("query must be a string", "BAD_REQUEST", "request error"), 400);
    }

    const result = await graphql({
      schema: linearSchema,
      source: body.query,
      contextValue: { store, authToken: token },
      variableValues: body.variables && typeof body.variables === "object" ? (body.variables as Record<string, unknown>) : undefined,
      operationName: typeof body.operationName === "string" ? body.operationName : undefined,
      fieldResolver: linearFieldResolver,
    });

    return c.json({
      data: result.data ?? null,
      errors: (result.errors ?? []).map((error) => {
        const json = error.toJSON();
        return { ...json, extensions: { code: "GRAPHQL_ERROR", type: "graphql error", ...json.extensions } };
      }),
    });
  });

  app.all("/graphql", (c) => c.json(errorPayload("Only POST /graphql is supported", "METHOD_NOT_ALLOWED", "request error"), 405));
}
