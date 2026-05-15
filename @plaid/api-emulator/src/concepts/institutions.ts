import type { JsonObject, PlaidInstitution } from "../types.ts";

export function institutionPayload(institution: PlaidInstitution): JsonObject {
  return {
    institution_id: institution.institution_id,
    name: institution.name,
    products: institution.products,
    country_codes: institution.country_codes,
    url: "https://example.test",
    primary_color: "#1f8efa",
    logo: null,
    routing_numbers: [],
    oauth: institution.oauth,
  };
}
