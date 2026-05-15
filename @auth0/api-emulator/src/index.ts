import { registerRoutes, seedDefaults } from "./routes/http.ts";
import type { Auth0SeedConfig } from "./routes/http.ts";

export { seedFromConfig } from "./routes/http.ts";
export type { Auth0SeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "auth0",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Auth0 OIDC and Management API emulator";
export const endpoints = "Auth0 OIDC discovery, OAuth token flows, userinfo, logout, users, roles, applications, connections, organizations, tickets, log events";
export const initConfig = {
  auth0: {
    clients: [{ client_id: "auth0-test-client", client_secret: "auth0-test-secret", redirect_uris: ["http://localhost:3000/callback"] }],
    users: [{ email: "user@example.com", password: "password", name: "Example User" }],
  } satisfies Auth0SeedConfig["auth0"],
};

export default plugin;
