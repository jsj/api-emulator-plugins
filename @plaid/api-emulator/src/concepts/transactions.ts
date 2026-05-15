import type { JsonObject, PlaidTransaction } from "../types.ts";

export function transactionPayload(transaction: PlaidTransaction): JsonObject {
  return {
    transaction_id: transaction.transaction_id,
    account_id: transaction.account_id,
    amount: transaction.amount,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    category: transaction.category,
    category_id: "13005032",
    date: transaction.date,
    authorized_date: transaction.date,
    name: transaction.name,
    merchant_name: transaction.name,
    payment_channel: "in store",
    pending: transaction.pending,
    transaction_type: "place",
  };
}
