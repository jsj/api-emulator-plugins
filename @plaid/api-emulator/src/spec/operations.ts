export type Fidelity = "modeled" | "fallback" | "unsupported";

export type Operation = {
  operationId: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  concept: "linkToken" | "item" | "account" | "transaction" | "institution" | "transfer" | "fallback";
  fidelity: Fidelity;
};

export const modeledOperations: Operation[] = [
  { operationId: "linkTokenCreate", method: "POST", path: "/link/token/create", concept: "linkToken", fidelity: "modeled" },
  { operationId: "linkTokenGet", method: "POST", path: "/link/token/get", concept: "linkToken", fidelity: "modeled" },
  { operationId: "sandboxPublicTokenCreate", method: "POST", path: "/sandbox/public_token/create", concept: "item", fidelity: "modeled" },
  { operationId: "itemPublicTokenCreate", method: "POST", path: "/item/public_token/create", concept: "item", fidelity: "modeled" },
  { operationId: "itemPublicTokenExchange", method: "POST", path: "/item/public_token/exchange", concept: "item", fidelity: "modeled" },
  { operationId: "itemGet", method: "POST", path: "/item/get", concept: "item", fidelity: "modeled" },
  { operationId: "itemRemove", method: "POST", path: "/item/remove", concept: "item", fidelity: "modeled" },
  { operationId: "itemAccessTokenInvalidate", method: "POST", path: "/item/access_token/invalidate", concept: "item", fidelity: "modeled" },
  { operationId: "accountsGet", method: "POST", path: "/accounts/get", concept: "account", fidelity: "modeled" },
  { operationId: "accountsBalanceGet", method: "POST", path: "/accounts/balance/get", concept: "account", fidelity: "modeled" },
  { operationId: "authGet", method: "POST", path: "/auth/get", concept: "account", fidelity: "modeled" },
  { operationId: "identityGet", method: "POST", path: "/identity/get", concept: "account", fidelity: "modeled" },
  { operationId: "transactionsGet", method: "POST", path: "/transactions/get", concept: "transaction", fidelity: "modeled" },
  { operationId: "transactionsSync", method: "POST", path: "/transactions/sync", concept: "transaction", fidelity: "modeled" },
  { operationId: "transactionsRefresh", method: "POST", path: "/transactions/refresh", concept: "transaction", fidelity: "modeled" },
  { operationId: "categoriesGet", method: "POST", path: "/categories/get", concept: "fallback", fidelity: "modeled" },
  { operationId: "institutionsGet", method: "POST", path: "/institutions/get", concept: "institution", fidelity: "modeled" },
  { operationId: "institutionsSearch", method: "POST", path: "/institutions/search", concept: "institution", fidelity: "modeled" },
  { operationId: "institutionsGetById", method: "POST", path: "/institutions/get_by_id", concept: "institution", fidelity: "modeled" },
  { operationId: "transferAuthorizationCreate", method: "POST", path: "/transfer/authorization/create", concept: "transfer", fidelity: "modeled" },
  { operationId: "transferCreate", method: "POST", path: "/transfer/create", concept: "transfer", fidelity: "modeled" },
  { operationId: "transferGet", method: "POST", path: "/transfer/get", concept: "transfer", fidelity: "modeled" },
  { operationId: "transferList", method: "POST", path: "/transfer/list", concept: "transfer", fidelity: "modeled" },
];

export const fallbackOperations: Operation[] = [
  { operationId: "plaidOpenApiFallbackPost", method: "POST", path: "*", concept: "fallback", fidelity: "fallback" },
  { operationId: "plaidOpenApiFallbackGet", method: "GET", path: "*", concept: "fallback", fidelity: "fallback" },
];

export const operations = [...modeledOperations, ...fallbackOperations];
