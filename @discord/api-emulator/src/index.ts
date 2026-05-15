import { registerRoutes, seedDefaults } from "./routes/http.ts";
import type { DiscordSeedConfig } from "./routes/http.ts";

export { seedFromConfig } from "./routes/http.ts";
export type { DiscordSeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "discord",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Discord REST and OAuth emulator";
export const endpoints = "Discord users, guilds, channels, messages, members, roles, OAuth, and inspector";
export const initConfig = {
  discord: {
    bot_token: "discord-emulator-bot-token",
    application: { client_id: "discord-test-client", client_secret: "discord-test-secret" },
    guilds: [{ name: "Emulator Guild" }],
  } satisfies DiscordSeedConfig["discord"],
};

export default plugin;
