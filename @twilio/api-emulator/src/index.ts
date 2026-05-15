import { registerRoutes, seedDefaults } from "./routes/http.ts";
import type { TwilioSeedConfig } from "./routes/http.ts";

export { seedFromConfig } from "./routes/http.ts";
export type { TwilioSeedConfig } from "./routes/http.ts";

export const plugin = {
  name: "twilio",
  register(app: Parameters<typeof registerRoutes>[0], store: Parameters<typeof registerRoutes>[1]) {
    registerRoutes(app, store);
  },
  seed(store: Parameters<typeof seedDefaults>[0]) {
    seedDefaults(store);
  },
};

export const label = "Twilio SMS, voice, and Verify emulator";
export const endpoints = "Twilio Messages, Calls, Verify, and inspector endpoints";
export const initConfig = {
  twilio: {
    account_sid: "AC00000000000000000000000000000000",
    auth_token: "twilio-emulator-token",
    phone_numbers: ["+15555550100"],
    verify_services: [{ sid: "VA00000000000000000000000000000000", friendly_name: "Default Verify Service" }],
  } satisfies TwilioSeedConfig["twilio"],
};

export default plugin;
