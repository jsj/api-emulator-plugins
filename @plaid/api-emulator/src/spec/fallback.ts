import { itemForAccessToken, itemPayload } from "../concepts/items.ts";
import type { AppLike, ContextLike, JsonObject } from "../types.ts";
import type { PlaidStore } from "../store.ts";
import { asString, requestId } from "../utils.ts";

export function genericResponse(path: string, body: JsonObject, plaid: PlaidStore): JsonObject {
  const id = crypto.randomUUID();
  const base = { request_id: requestId() };

  if (path.endsWith("/list")) {
    const key = path.split("/").filter(Boolean).at(-2)?.replace(/-/g, "_") ?? "items";
    return { [key.endsWith("s") ? key : `${key}s`]: [], ...base };
  }
  if (path.endsWith("/get")) return { ...base, item: itemPayload(itemForAccessToken(plaid, body.access_token)) };
  if (path.endsWith("/create")) return { ...base, id, status: "created" };
  if (path.endsWith("/update")) return { ...base, status: "updated" };
  if (path.endsWith("/remove") || path.endsWith("/revoke") || path.endsWith("/cancel") || path.endsWith("/terminate")) return { ...base, removed: true };
  if (path.includes("/pdf/") || path.endsWith("/pdf/get") || path.endsWith("/download")) return { ...base, data: "" };
  return { ...base, status: "ok" };
}

export function registerFallbackRoutes(app: AppLike, plaid: PlaidStore): void {
  const fallback = async (context: ContextLike) => {
    const body = await context.req.json().catch(() => ({}));
    const path = asString(context.req.param("*"), "");
    return context.json(genericResponse(path.startsWith("/") ? path : `/${path}`, body, plaid), 200);
  };

  app.post("*", fallback);
  app.post("/*", fallback);
  app.get?.("*", fallback);
  app.get?.("/*", fallback);
}
