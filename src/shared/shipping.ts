import { DEFAULT_DESTINATION_COUNTRY } from "./constants";
import type { ShippingLookup, ShippingQuote } from "./types";

export { DEFAULT_DESTINATION_COUNTRY };

export class UnavailableShippingLookup implements ShippingLookup {
  async getShippingCost(_params: {
    productId: string;
    variantId?: string;
    destinationCountry: string;
  }): Promise<ShippingQuote> {
    return { available: false, reason: "NOT_RETRIEVED" };
  }
}
