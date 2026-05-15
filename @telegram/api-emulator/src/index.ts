import { registerRoutes, seedDefaults } from "./routes/http.ts";
import type { TelegramSeedConfig } from "./routes/http.ts";

export { seedFromConfig } from "./routes/http.ts";
export type { TelegramSeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "telegram",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Telegram Bot API emulator";
export const endpoints = "Telegram bot methods, long polling, webhooks, file serving, control plane, and inspector";
export const initConfig = {
  telegram: {
    bots: [{ token: "telegram-emulator-token", username: "emulator_bot" }],
  } satisfies TelegramSeedConfig["telegram"],
};

export default plugin;
