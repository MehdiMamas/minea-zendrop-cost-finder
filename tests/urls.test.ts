import { describe, expect, it } from "vitest";
import { pickZendropImage, normalizeZendropImageUrl, zendropProductPageUrl, zendropSearchPageUrl } from "../src/shared/urls";

describe("Zendrop URLs", () => {
  it("opens a product detail page from id", () => {
    expect(zendropProductPageUrl(202)).toBe("https://app.zendrop.com/product/202");
  });

  it("uses an API permalink when it is already a Zendrop product page", () => {
    expect(zendropProductPageUrl(202, "https://app.zendrop.com/product/202")).toBe(
      "https://app.zendrop.com/product/202"
    );
  });

  it("ignores non-product permalinks", () => {
    expect(zendropProductPageUrl(202, "https://example.com/foo")).toBe("https://app.zendrop.com/product/202");
  });

  it("keeps search URLs separate from product pages", () => {
    expect(zendropSearchPageUrl("7-Piece Acacia Wood Utensil Set")).toBe(
      "https://app.zendrop.com/product?page=1&search=7-Piece%20Acacia%20Wood%20Utensil%20Set"
    );
    expect(zendropProductPageUrl(202)).not.toContain("search=");
  });

  it("prefers file.zendrop.com images", () => {
    expect(
      pickZendropImage([
        "https://cdn.example.com/other.png",
        "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
      ])
    ).toBe("https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png");
  });

  it("builds file.zendrop.com URLs from relative product image paths", () => {
    expect(normalizeZendropImageUrl("products/b5/0b/316759c6443296452ed913c92936.png")).toBe(
      "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
    );
    expect(normalizeZendropImageUrl("b5/0b/316759c6443296452ed913c92936.png")).toBe(
      "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
    );
  });
});
