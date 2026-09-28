import { describe, expect, it } from "vitest";
import { extractCost, looksLikeGenericTitle, normalizeQuery, stripSiteSuffix } from "../src/shared/utils";

describe("cost extraction", () => {
  it("prefers base_cost_price", () => {
    const cost = extractCost({
      id: 1,
      name: "Test",
      baseCostPrice: 2.98,
      displayPrice: 3.43,
      metricsCost: 2.5,
      productImages: []
    });
    expect(cost.source).toBe("base_cost_price");
    expect(cost.amount).toBe(2.98);
    expect(cost.costUnavailable).toBe(false);
    expect(cost.label).toBe("Product cost");
  });

  it("falls back to metrics.cost then display_price", () => {
    expect(
      extractCost({
        id: 1,
        name: "Test",
        metricsCost: 4,
        displayPrice: 5,
        productImages: []
      }).source
    ).toBe("metrics.cost");

    const displayOnly = extractCost({
      id: 1,
      name: "Test",
      displayPrice: 5,
      productImages: []
    });
    expect(displayOnly.source).toBe("display_price");
    expect(displayOnly.costUnavailable).toBe(true);
    expect(displayOnly.label).toBe("Zendrop displayed price");
  });
});

describe("query helpers", () => {
  it("normalizes search keys and Minea titles", () => {
    expect(normalizeQuery("  7-Piece   Utensil Set ")).toBe("7-piece utensil set");
    expect(stripSiteSuffix("7-Piece Acacia Wood Utensil Set | Minea")).toBe(
      "7-Piece Acacia Wood Utensil Set"
    );
    expect(looksLikeGenericTitle("Minea | Find your winning product in 3 clicks.")).toBe(true);
    expect(looksLikeGenericTitle("7-Piece Acacia Wood Utensil Set")).toBe(false);
  });
});
