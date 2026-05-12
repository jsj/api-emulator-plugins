import type { RouteContext, Store } from "@emulators/core";
import { ascId, jsonApiResource, jsonApiList, jsonApiError, parseCursor } from "../jsonapi.js";

// Auth entities stored in the generic store data (not collections)
// since they're singleton-like config.

interface ASCUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

interface ASCActor {
  id: string;
  actor_type: string;
  user_id: string | null;
}

function getUsers(store: Store): ASCUser[] {
  return store.getData<ASCUser[]>("asc.users") ?? [];
}

function getActors(store: Store): ASCActor[] {
  return store.getData<ASCActor[]>("asc.actors") ?? [];
}

function getAuthStatus(store: Store): { authenticated: boolean } {
  return store.getData<{ authenticated: boolean }>("asc.auth_status") ?? { authenticated: true };
}

function now(): string {
  return new Date().toISOString();
}

function fakeSignedHeaders(body: Record<string, unknown> = {}) {
  const request = (body.request ?? {}) as { url?: unknown; method?: unknown };
  return {
    headers: {
      "X-Apple-MD": "fake-md",
      "X-Apple-MD-M": "fake-md-m",
      "X-Apple-MD-RINFO": "17106176",
      "X-Apple-MD-LU": "fake-lu",
      "X-VPhone-Apple-Emulator": "1",
    },
    mescalSignature: "fake-mescal-signature",
    request: {
      url: typeof request.url === "string" ? request.url : null,
      method: typeof request.method === "string" ? request.method : null,
    },
    issuedAt: now(),
  };
}

export function authRoutes({ app, store, baseUrl }: RouteContext): void {
  app.get("/bag.xml", (c) => c.json({
    status: 0,
    bag: {
      profile: "AMSCore",
      profileVersion: "1",
      environment: "emulator",
    },
    issuedAt: now(),
  }));

  app.post("/v1/signSapSetup", async (c) => {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
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
        email: "demo@apple-emulator.local",
      },
      token: "apple-emulator-token",
      issuedAt: now(),
    });
  });

  // List users
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
            roles: u.roles,
          },
        })),
        cursor,
        limit,
        users.length,
      ),
    );
  });

  // Get user
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
        roles: user.roles,
      }),
    );
  });

  // List actors
  app.get("/v1/ciProducts/:productId/additionalRepositories", (_c) => {
    // Stub — not all routes need behavior
    return _c.json({ data: [], links: { self: `${baseUrl}/v1/ciProducts` }, meta: { paging: { total: 0, limit: 50 } } });
  });

  // User invitations
  app.get("/v1/userInvitations", (c) => {
    return c.json(jsonApiList(baseUrl, "userInvitations", [], 0, 50, 0));
  });
}
