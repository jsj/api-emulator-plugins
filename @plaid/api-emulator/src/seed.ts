import { getPlaidStore } from "./store.ts";
import type { PlaidSeedConfig, StoreLike } from "./types.ts";
import { today } from "./utils.ts";

export function seedDefaults(store: StoreLike): void {
  const plaid = getPlaidStore(store);

  if (!plaid.institutions.all().length) {
    plaid.institutions.insert({
      institution_id: "ins_109508",
      name: "First Platypus Bank",
      products: ["auth", "transactions", "identity", "assets", "investments"],
      country_codes: ["US"],
      oauth: false,
    });
    plaid.institutions.insert({
      institution_id: "ins_127991",
      name: "Plaid Bank",
      products: ["auth", "transactions", "identity"],
      country_codes: ["US", "CA"],
      oauth: true,
    });
  }

  if (!plaid.items.all().length) {
    plaid.items.insert({
      item_id: "item-emulator-1",
      access_token: "access-sandbox-emulator",
      institution_id: "ins_109508",
      webhook: "https://example.test/plaid/webhook",
      products: ["auth", "transactions"],
    });
  }

  if (!plaid.accounts.all().length) {
    plaid.accounts.insert({
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
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
      account_id: "acc-savings-1",
      item_id: "item-emulator-1",
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

  if (!plaid.transactions.all().length) {
    plaid.transactions.insert({
      transaction_id: "txn-coffee-1",
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
      name: "Coffee Shop",
      amount: 4.21,
      date: today(-1),
      category: ["Food and Drink", "Restaurants", "Coffee Shop"],
      pending: false,
    });
    plaid.transactions.insert({
      transaction_id: "txn-payroll-1",
      account_id: "acc-checking-1",
      item_id: "item-emulator-1",
      name: "Payroll",
      amount: -1250,
      date: today(-7),
      category: ["Transfer", "Payroll"],
      pending: false,
    });
  }
}

export function seedFromConfig(store: StoreLike, _baseUrl: string, config: PlaidSeedConfig): void {
  const seed = config.plaid;
  if (!seed) {
    seedDefaults(store);
    return;
  }

  const plaid = getPlaidStore(store);
  plaid.items.clear();
  plaid.accounts.clear();
  plaid.transactions.clear();
  plaid.institutions.clear();
  plaid.transfers.clear();
  plaid.linkTokens.clear();

  seedDefaults(store);

  for (const institution of seed.institutions ?? []) {
    plaid.institutions.insert({
      institution_id: institution.institution_id,
      name: institution.name,
      products: institution.products ?? ["auth", "transactions"],
      country_codes: institution.country_codes ?? ["US"],
      oauth: institution.oauth ?? false,
    });
  }

  if (seed.item) {
    plaid.items.insert({
      item_id: seed.item.item_id ?? "item-seeded-1",
      access_token: seed.item.access_token ?? "access-sandbox-seeded",
      institution_id: seed.item.institution_id ?? "ins_109508",
      webhook: seed.item.webhook,
      products: seed.item.products ?? ["auth", "transactions"],
    });
  }

  for (const account of seed.accounts ?? []) {
    plaid.accounts.insert({
      account_id: account.account_id,
      item_id: account.item_id ?? "item-seeded-1",
      name: account.name,
      official_name: account.official_name ?? account.name,
      mask: account.mask ?? "0000",
      type: account.type ?? "depository",
      subtype: account.subtype ?? "checking",
      available: account.available ?? 100,
      current: account.current ?? 100,
      iso_currency_code: account.iso_currency_code ?? "USD",
    });
  }

  for (const transaction of seed.transactions ?? []) {
    plaid.transactions.insert({
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      item_id: transaction.item_id ?? "item-seeded-1",
      name: transaction.name ?? "Seeded Transaction",
      amount: transaction.amount ?? 1,
      date: transaction.date ?? today(-1),
      category: transaction.category ?? ["Transfer"],
      pending: transaction.pending ?? false,
    });
  }
}
