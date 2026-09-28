export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type CostSource = "base_cost_price" | "metrics.cost" | "display_price" | "none";

export type MineaProduct = {
  name: string;
  images: string[];
  url: string;
  source: "details-title" | "document-title" | "heading" | "next-data" | "json-ld" | "mixed";
};

export type ZendropProduct = {
  id: number;
  name: string;
  supplierId?: number;
  baseCostPrice?: number;
  displayPrice?: number;
  metricsCost?: number;
  featuredImageUrl?: string;
  productImages: string[];
  permalink?: string;
};

export type CostInfo = {
  amount?: number;
  label: string;
  source: CostSource;
  costUnavailable: boolean;
};

export type MatchResult = {
  product: ZendropProduct;
  score: number;
  confidence: Confidence;
  cost: CostInfo;
};

export type ShippingQuote = {
  available: false;
  reason: "NOT_RETRIEVED";
};

export type ShippingLookup = {
  getShippingCost(params: {
    productId: string;
    variantId?: string;
    destinationCountry: string;
  }): Promise<ShippingQuote>;
};

export type ProductMatcher = {
  match(
    mineaProduct: MineaProduct,
    zendropProducts: ZendropProduct[]
  ): MatchResult[];
};

export type AuthErrorCode = "ZENDROP_AUTH_REQUIRED";

export type SearchSuccess = {
  ok: true;
  authenticated: true;
  query: string;
  products: ZendropProduct[];
  fromCache: boolean;
};

export type SearchAuthFailure = {
  ok: false;
  authenticated: false;
  error: AuthErrorCode;
  message: string;
};

export type SearchApiFailure = {
  ok: false;
  authenticated: true;
  error: "ZENDROP_SEARCH_FAILED";
  message: string;
};

export type SearchResponse = SearchSuccess | SearchAuthFailure | SearchApiFailure;

export type TabUiState = {
  mineaProductName?: string;
  bestMatchName?: string;
  costLabel?: string;
  costAmount?: number;
  confidence?: Confidence;
  status:
    | "idle"
    | "loading"
    | "ready"
    | "auth"
    | "empty"
    | "error"
    | "undetected";
  zendropSearchUrl?: string;
  zendropProductUrl?: string;
};
