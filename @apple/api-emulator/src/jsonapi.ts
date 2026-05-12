import { randomBytes } from "crypto";
import type { Context } from "hono";

export function ascId(): string {
  return randomBytes(8).toString("hex");
}

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, unknown>;
  links: { self: string };
}

export function jsonApiResource(
  baseUrl: string,
  type: string,
  id: string,
  attributes: Record<string, unknown>,
  relationships?: Record<string, unknown>,
): { data: JsonApiResource; links: { self: string } } {
  const self = `${baseUrl}/v1/${type}/${id}`;
  return {
    data: {
      type,
      id,
      attributes,
      ...(relationships ? { relationships } : {}),
      links: { self },
    },
    links: { self },
  };
}

export function jsonApiList(
  baseUrl: string,
  type: string,
  items: Array<{ id: string; attributes: Record<string, unknown> }>,
  cursor: number,
  limit: number,
  total: number,
): object {
  const self = `${baseUrl}/v1/${type}?limit=${limit}`;
  const hasNext = cursor + limit < total;
  return {
    data: items.map((item) => ({
      type,
      id: item.id,
      attributes: item.attributes,
      links: { self: `${baseUrl}/v1/${type}/${item.id}` },
    })),
    links: {
      self,
      ...(hasNext ? { next: `${baseUrl}/v1/${type}?cursor=${cursor + limit}&limit=${limit}` } : {}),
    },
    meta: {
      paging: { total, limit },
    },
  };
}

export function jsonApiError(
  status: number,
  code: string,
  title: string,
  detail: string,
): { errors: Array<{ status: string; code: string; title: string; detail: string }> } {
  return {
    errors: [{ status: String(status), code, title, detail }],
  };
}

export function parseCursor(c: Context): { cursor: number; limit: number } {
  const cursor = Math.max(0, parseInt(c.req.query("cursor") ?? "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query("limit") ?? "50", 10) || 50));
  return { cursor, limit };
}

export async function parseJsonApiBody(c: Context): Promise<{
  type: string;
  attributes: Record<string, unknown>;
  relationships: Record<string, { data: { type: string; id: string } }>;
}> {
  const json = await c.req.json();
  const data = json?.data;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON:API request body");
  }
  return {
    type: data.type ?? "",
    attributes: data.attributes ?? {},
    relationships: data.relationships ?? {},
  };
}
