import type { JsonObject, PlaidAccount } from "../types.ts";

export function accountPayload(account: PlaidAccount): JsonObject {
  return {
    account_id: account.account_id,
    balances: {
      available: account.available,
      current: account.current,
      limit: null,
      iso_currency_code: account.iso_currency_code,
      unofficial_currency_code: null,
    },
    mask: account.mask,
    name: account.name,
    official_name: account.official_name,
    type: account.type,
    subtype: account.subtype,
  };
}

export function authNumbers(accounts: PlaidAccount[]): JsonObject {
  return {
    ach: accounts.map((account, index) => ({
      account_id: account.account_id,
      account: `${index + 1111222200}`,
      routing: "011401533",
      wire_routing: "021000021",
    })),
    eft: [],
    international: [],
    bacs: [],
  };
}
