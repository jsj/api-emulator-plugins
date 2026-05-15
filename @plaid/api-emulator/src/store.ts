import type {
  PlaidAccount,
  PlaidInstitution,
  PlaidItem,
  PlaidLinkToken,
  PlaidTransaction,
  PlaidTransfer,
  StoreLike,
} from "./types.ts";

export function getPlaidStore(store: StoreLike) {
  return {
    items: store.collection<PlaidItem>("plaid.items", ["item_id", "access_token"]),
    accounts: store.collection<PlaidAccount>("plaid.accounts", ["account_id", "item_id"]),
    transactions: store.collection<PlaidTransaction>("plaid.transactions", ["transaction_id", "account_id", "item_id"]),
    institutions: store.collection<PlaidInstitution>("plaid.institutions", ["institution_id", "name"]),
    transfers: store.collection<PlaidTransfer>("plaid.transfers", ["transfer_id", "authorization_id", "account_id", "status"]),
    linkTokens: store.collection<PlaidLinkToken>("plaid.link_tokens", ["link_token"]),
  };
}

export type PlaidStore = ReturnType<typeof getPlaidStore>;
