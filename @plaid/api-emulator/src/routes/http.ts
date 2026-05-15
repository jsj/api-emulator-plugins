import { accountPayload, authNumbers } from "../concepts/accounts.ts";
import { institutionPayload } from "../concepts/institutions.ts";
import { createExchangedItem, itemForAccessToken, itemPayload } from "../concepts/items.ts";
import { transactionPayload } from "../concepts/transactions.ts";
import type { AppLike } from "../types.ts";
import type { PlaidStore } from "../store.ts";
import { asString, asStringArray, isoOffset, requestId, token } from "../utils.ts";

export function registerModeledRoutes(app: AppLike, plaid: PlaidStore): void {
  app.post("/link/token/create", async (context) => {
    const body = await context.req.json();
    const linkToken = plaid.linkTokens.insert({
      link_token: token("link-sandbox"),
      client_name: asString(body.client_name, "Plaid Emulator"),
      products: asStringArray(body.products, ["auth", "transactions"]),
      country_codes: asStringArray(body.country_codes, ["US"]),
      language: asString(body.language, "en"),
      expiration: isoOffset(30),
    });

    return context.json({
      link_token: linkToken.link_token,
      expiration: linkToken.expiration,
      request_id: requestId(),
    }, 200);
  });

  app.post("/link/token/get", async (context) => {
    const body = await context.req.json();
    const linkToken = plaid.linkTokens.findOneBy("link_token", asString(body.link_token, ""));
    return context.json({
      link_token: body.link_token,
      metadata: {
        client_name: linkToken?.client_name ?? "Plaid Emulator",
        products: linkToken?.products ?? ["auth", "transactions"],
        country_codes: linkToken?.country_codes ?? ["US"],
        language: linkToken?.language ?? "en",
      },
      expiration: linkToken?.expiration ?? isoOffset(30),
      created_at: linkToken?.created_at ?? new Date().toISOString(),
      request_id: requestId(),
    }, 200);
  });

  app.post("/sandbox/public_token/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      public_token: token("public-sandbox"),
      request_id: requestId(),
      item_id: itemForAccessToken(plaid, body.access_token).item_id,
    }, 200);
  });

  app.post("/item/public_token/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      public_token: token("public-sandbox"),
      request_id: requestId(),
      item_id: itemForAccessToken(plaid, body.access_token).item_id,
    }, 200);
  });

  app.post("/item/public_token/exchange", async (context) => {
    const item = createExchangedItem(plaid);
    return context.json({
      access_token: item.access_token,
      item_id: item.item_id,
      request_id: requestId(),
    }, 200);
  });

  app.post("/item/get", async (context) => {
    const body = await context.req.json();
    return context.json({
      item: itemPayload(itemForAccessToken(plaid, body.access_token)),
      status: null,
      request_id: requestId(),
    }, 200);
  });

  app.post("/item/remove", async (context) => {
    const body = await context.req.json();
    const item = plaid.items.findOneBy("access_token", asString(body.access_token, ""));
    if (item) plaid.items.update(item.id, { products: [] });
    return context.json({ removed: true, request_id: requestId() }, 200);
  });

  app.post("/item/access_token/invalidate", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const newAccessToken = token("access-sandbox");
    plaid.items.update(item.id, { access_token: newAccessToken });
    return context.json({ new_access_token: newAccessToken, request_id: requestId() }, 200);
  });

  app.post("/accounts/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/accounts/balance/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({ accounts: accounts.map(accountPayload), item: itemPayload(item), request_id: requestId() }, 200);
  });

  app.post("/auth/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      numbers: authNumbers(accounts),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/identity/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map((account) => ({
        ...accountPayload(account),
        owners: [{
          names: ["Plaid Emulator User"],
          phone_numbers: [{ data: "555-867-5309", primary: true, type: "home" }],
          emails: [{ data: "user@example.test", primary: true, type: "primary" }],
          addresses: [],
        }],
      })),
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/get", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const transactions = plaid.transactions.all().filter((transaction) => transaction.item_id === item.item_id);
    const accounts = plaid.accounts.all().filter((account) => account.item_id === item.item_id);
    return context.json({
      accounts: accounts.map(accountPayload),
      transactions: transactions.map(transactionPayload),
      total_transactions: transactions.length,
      item: itemPayload(item),
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/sync", async (context) => {
    const body = await context.req.json();
    const item = itemForAccessToken(plaid, body.access_token);
    const transactions = plaid.transactions.all().filter((transaction) => transaction.item_id === item.item_id);
    return context.json({
      added: transactions.map(transactionPayload),
      modified: [],
      removed: [],
      next_cursor: `cursor-${transactions.length}`,
      has_more: false,
      request_id: requestId(),
    }, 200);
  });

  app.post("/transactions/refresh", (context) => context.json({ request_id: requestId() }, 200));

  app.post("/categories/get", (context) => context.json({
    categories: [
      { category_id: "13005032", group: "place", hierarchy: ["Food and Drink", "Restaurants", "Coffee Shop"] },
      { category_id: "21009000", group: "special", hierarchy: ["Transfer", "Payroll"] },
    ],
    request_id: requestId(),
  }, 200));

  app.post("/institutions/get", async (context) => {
    const body = await context.req.json();
    const count = typeof body.count === "number" ? body.count : 100;
    const offset = typeof body.offset === "number" ? body.offset : 0;
    const institutions = plaid.institutions.all().slice(offset, offset + count);
    return context.json({
      institutions: institutions.map(institutionPayload),
      total: plaid.institutions.all().length,
      request_id: requestId(),
    }, 200);
  });

  app.post("/institutions/search", async (context) => {
    const body = await context.req.json();
    const query = asString(body.query, "").toLowerCase();
    const institutions = plaid.institutions.all().filter((institution) => !query || institution.name.toLowerCase().includes(query));
    return context.json({ institutions: institutions.map(institutionPayload), request_id: requestId() }, 200);
  });

  app.post("/institutions/get_by_id", async (context) => {
    const body = await context.req.json();
    const institution = plaid.institutions.findOneBy("institution_id", asString(body.institution_id, "ins_109508")) ?? plaid.institutions.all()[0];
    return context.json({ institution: institutionPayload(institution), request_id: requestId() }, 200);
  });

  app.post("/transfer/authorization/create", async (context) => {
    const body = await context.req.json();
    return context.json({
      authorization: {
        id: token("authorization"),
        decision: "approved",
        created: new Date().toISOString(),
        decision_rationale: null,
        guarantee_decision: null,
        proposed_transfer: body,
      },
      request_id: requestId(),
    }, 200);
  });

  app.post("/transfer/create", async (context) => {
    const body = await context.req.json();
    const transfer = plaid.transfers.insert({
      transfer_id: token("transfer"),
      authorization_id: asString(body.authorization_id, token("authorization")),
      access_token: asString(body.access_token, "access-sandbox-emulator"),
      account_id: asString(body.account_id, "acc-checking-1"),
      amount: asString(body.amount, "1.00"),
      description: asString(body.description, "Plaid emulator transfer"),
      ach_class: asString(body.ach_class, "ppd"),
      type: asString(body.type, "credit"),
      network: asString(body.network, "ach"),
      status: "pending",
    });
    return context.json({ transfer, request_id: requestId() }, 200);
  });

  app.post("/transfer/get", async (context) => {
    const body = await context.req.json();
    const transfer = plaid.transfers.findOneBy("transfer_id", asString(body.transfer_id, ""));
    return context.json({ transfer: transfer ?? plaid.transfers.all()[0] ?? null, request_id: requestId() }, 200);
  });

  app.post("/transfer/list", (context) => context.json({
    transfers: plaid.transfers.all(),
    request_id: requestId(),
    has_more: false,
  }, 200));
}
