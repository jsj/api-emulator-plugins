import type { JsonObject, PlaidItem } from "../types.ts";
import type { PlaidStore } from "../store.ts";
import { asString, token } from "../utils.ts";

export function itemForAccessToken(plaid: PlaidStore, accessToken: unknown): PlaidItem {
  const tokenValue = asString(accessToken, "access-sandbox-emulator");
  const existing = plaid.items.findOneBy("access_token", tokenValue);
  if (existing) return existing;

  return plaid.items.insert({
    item_id: `item-${crypto.randomUUID()}`,
    access_token: tokenValue,
    institution_id: "ins_109508",
    products: ["auth", "transactions"],
  });
}

export function itemPayload(item: PlaidItem): JsonObject {
  return {
    item_id: item.item_id,
    institution_id: item.institution_id,
    webhook: item.webhook ?? null,
    error: null,
    available_products: ["assets", "auth", "balance", "identity", "investments", "liabilities", "transactions"],
    billed_products: item.products,
    products: item.products,
    consented_products: item.products,
    update_type: "background",
  };
}

export function ensureAccountsForItem(plaid: PlaidStore, item: PlaidItem): void {
  if (plaid.accounts.all().some((account) => account.item_id === item.item_id)) return;

  const suffix = item.item_id.slice(-8).replace(/[^a-z0-9]/gi, "") || "emulator";
  plaid.accounts.insert({
    account_id: `acc-checking-${suffix}`,
    item_id: item.item_id,
    name: "Plaid Checking",
    official_name: "Plaid Gold Standard 0% Interest Checking",
    mask: "0000",
    type: "depository",
    subtype: "checking",
    available: 110,
    current: 120,
    iso_currency_code: "USD",
  });
  plaid.accounts.insert({
    account_id: `acc-savings-${suffix}`,
    item_id: item.item_id,
    name: "Plaid Saving",
    official_name: "Plaid Silver Standard 0.1% Interest Saving",
    mask: "1111",
    type: "depository",
    subtype: "savings",
    available: 210,
    current: 210,
    iso_currency_code: "USD",
  });
}

export function createExchangedItem(plaid: PlaidStore): PlaidItem {
  const item = plaid.items.insert({
    item_id: `item-${crypto.randomUUID()}`,
    access_token: token("access-sandbox"),
    institution_id: "ins_109508",
    products: ["auth", "transactions"],
  });
  ensureAccountsForItem(plaid, item);
  return item;
}
