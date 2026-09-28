import { describe, expect, it } from "vitest";
import { confidenceFromScore, scoreTitles, TitleMatcher } from "../src/content/matcher";
import type { MineaProduct, ZendropProduct } from "../src/shared/types";

const minea: MineaProduct = {
  name: "7-Piece Acacia Wood Utensil Set",
  images: [],
  url: "https://app.minea.com/product/1",
  source: "document-title"
};

const utensilSet: ZendropProduct = {
  id: 202,
  name: "7-Piece Wooden Kitchen Utensil Set",
  baseCostPrice: 2.98,
  displayPrice: 3.43,
  productImages: []
};

const spatulaSet: ZendropProduct = {
  id: 101,
  name: "Acacia Teak Wood Long-Handled Cooking Spatula Set – Perfect for Mixing & Serving in Style!",
  baseCostPrice: 0.65,
  displayPrice: 0.75,
  productImages: []
};

describe("title matching", () => {
  it("ranks the 7-piece utensil set above the spatula set", () => {
    const matcher = new TitleMatcher();
    const ranked = matcher.match(minea, [spatulaSet, utensilSet]);
    expect(ranked[0]?.product.id).toBe(202);
    expect(ranked[0]?.confidence).toBe("HIGH");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("gives a high score to close title variants", () => {
    const score = scoreTitles(minea.name, utensilSet.name);
    expect(score).toBeGreaterThanOrEqual(0.7);
    expect(confidenceFromScore(score)).toBe("HIGH");
  });
});
