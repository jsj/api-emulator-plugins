import { randomUUID } from "crypto";
import { GraphQLError } from "graphql";

export interface ConnectionArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

export function generateLinearId(): string {
  return randomUUID();
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

export function linearError(message: string, code: string, type = "graphql error"): GraphQLError {
  return new GraphQLError(message, { extensions: { code, type } });
}

function encodeCursor(index: number): string {
  return Buffer.from(`linear:${index}`).toString("base64url");
}

function decodeCursor(cursor: string): number | null {
  try {
    const match = Buffer.from(cursor, "base64url").toString("utf8").match(/^linear:(\d+)$/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export function toConnection<T>(items: T[], args: ConnectionArgs = {}) {
  let start = 0;
  let end = items.length;

  if (args.after) {
    const afterIndex = decodeCursor(args.after);
    if (afterIndex !== null) start = Math.max(start, afterIndex + 1);
  }
  if (args.before) {
    const beforeIndex = decodeCursor(args.before);
    if (beforeIndex !== null) end = Math.min(end, beforeIndex);
  }
  if (typeof args.first === "number") {
    if (args.first < 0) throw linearError("first must be greater than or equal to 0", "BAD_USER_INPUT", "validation error");
    end = Math.min(end, start + args.first);
  }
  if (typeof args.last === "number") {
    if (args.last < 0) throw linearError("last must be greater than or equal to 0", "BAD_USER_INPUT", "validation error");
    start = Math.max(start, end - args.last);
  }

  const nodes = items.slice(start, end);
  const edges = nodes.map((node, offset) => ({ node, cursor: encodeCursor(start + offset) }));
  return {
    edges,
    nodes,
    pageInfo: {
      hasNextPage: end < items.length,
      hasPreviousPage: start > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}
