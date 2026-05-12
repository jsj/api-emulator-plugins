import type { Hono } from "hono";
import type { AppEnv, Store, Collection, Entity } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor, parseJsonApiBody } from "./jsonapi.js";

/**
 * Generic JSON:API CRUD route generator for ASC services.
 *
 * Given a type name, collection accessor, and attribute mapping,
 * generates standard list/get/create/update/delete routes that
 * store real data — enabling full E2E CLI testing.
 */

export interface CrudConfig {
  /** JSON:API type name, e.g. "certificates" */
  type: string;
  /** Base path, e.g. "/v1/certificates" */
  basePath: string;
  /** Fields to copy from JSON:API attributes into the store entity */
  fields: string[];
  /** Optional parent filter, e.g. { param: "appId", storeField: "app_id", parentPath: "/v1/apps/:appId/..." } */
  parent?: { param: string; storeField: string };
  /** Relationship names whose IDs should be copied to additional store fields used by nested routes. */
  relationshipStoreFields?: Record<string, string[]>;
  /** If true, skip POST route */
  readOnly?: boolean;
  /** If true, skip DELETE route */
  noDelete?: boolean;
}

function snakeCase(s: string): string {
  return s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
}

export function registerCrud(
  app: Hono<AppEnv>,
  store: Store,
  baseUrl: string,
  config: CrudConfig,
): void {
  const collectionName = `asc.crud.${config.type}`;

  function getCollection(): Array<Record<string, unknown>> {
    let items = store.getData<Array<Record<string, unknown>>>(collectionName);
    if (!items) {
      items = [];
      store.setData(collectionName, items);
    }
    return items;
  }

  function formatItem(item: Record<string, unknown>) {
    const attrs: Record<string, unknown> = {};
    for (const field of config.fields) {
      const storeKey = snakeCase(field);
      attrs[field] = item[storeKey] ?? item[field] ?? null;
    }
    return { id: item.asc_id as string, attributes: attrs };
  }

  // LIST
  app.get(config.basePath, (c) => {
    const { cursor, limit } = parseCursor(c);
    let items = getCollection();

    // Apply parent filter if configured and URL has the param
    if (config.parent) {
      const parentValue = c.req.param(config.parent.param);
      if (parentValue) {
        items = items.filter((i) => i[config.parent!.storeField] === parentValue);
      }
      // Also check query filter
      const filterValue = c.req.query(`filter[${config.parent.param}]`);
      if (filterValue) {
        items = items.filter((i) => i[config.parent!.storeField] === filterValue);
      }
    }

    const total = items.length;
    const page = items.slice(cursor, cursor + limit);
    return c.json(jsonApiList(baseUrl, config.type, page.map(formatItem), cursor, limit, total));
  });

  // GET by ID
  app.get(`${config.basePath}/:id`, (c) => {
    const id = c.req.param("id");
    const items = getCollection();
    const found = items.find((i) => i.asc_id === id);
    if (!found) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `${config.type} ${id} not found`), 404);
    }
    return c.json(jsonApiResource(baseUrl, config.type, found.asc_id as string, formatItem(found).attributes));
  });

  // CREATE
  if (!config.readOnly) {
    app.post(config.basePath, async (c) => {
      const body = await parseJsonApiBody(c);
      const item: Record<string, unknown> = { asc_id: ascId() };

      for (const field of config.fields) {
        const storeKey = snakeCase(field);
        item[storeKey] = body.attributes[field] ?? null;
        item[field] = body.attributes[field] ?? null;
      }

      // Capture all relationships as store fields
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

      return c.json(jsonApiResource(baseUrl, config.type, item.asc_id as string, formatItem(item).attributes), 201);
    });
  }

  // UPDATE
  app.patch(`${config.basePath}/:id`, async (c) => {
    const id = c.req.param("id");
    const items = getCollection();
    const idx = items.findIndex((i) => i.asc_id === id);
    if (idx === -1) {
      return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `${config.type} ${id} not found`), 404);
    }

    const body = await parseJsonApiBody(c);
    for (const field of config.fields) {
      if (body.attributes[field] !== undefined) {
        const storeKey = snakeCase(field);
        items[idx][storeKey] = body.attributes[field];
        items[idx][field] = body.attributes[field];
      }
    }
    store.setData(collectionName, items);

    return c.json(jsonApiResource(baseUrl, config.type, id, formatItem(items[idx]).attributes));
  });

  // DELETE
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

/**
 * Register a nested list route, e.g. GET /v1/apps/:appId/certificates
 * that filters the collection by parent ID.
 */
export function registerNestedList(
  app: Hono<AppEnv>,
  store: Store,
  baseUrl: string,
  parentPath: string,
  config: CrudConfig,
  parentParam: string,
  storeField: string,
): void {
  const collectionName = `asc.crud.${config.type}`;

  function getCollection(): Array<Record<string, unknown>> {
    return store.getData<Array<Record<string, unknown>>>(collectionName) ?? [];
  }

  function formatItem(item: Record<string, unknown>) {
    const attrs: Record<string, unknown> = {};
    for (const field of config.fields) {
      const storeKey = snakeCase(field);
      attrs[field] = item[storeKey] ?? item[field] ?? null;
    }
    return { id: item.asc_id as string, attributes: attrs };
  }

  app.get(parentPath, (c) => {
    const parentId = c.req.param(parentParam);
    const { cursor, limit } = parseCursor(c);
    const items = getCollection().filter((i) => i[storeField] === parentId);
    const page = items.slice(cursor, cursor + limit);
    return c.json(jsonApiList(baseUrl, config.type, page.map(formatItem), cursor, limit, items.length));
  });
}
