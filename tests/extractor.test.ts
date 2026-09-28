import { describe, expect, it } from "vitest";
import { extractMineaProduct } from "../src/content/extractor";
import { isProductPage } from "../src/content/detector";

function mineaProductFixture(): void {
  document.head.innerHTML = `
    <meta property="og:title" content="Minea | Find your winning product in 3 clicks." />
    <meta property="og:image" content="https://app.minea.com/_next/static/media/thumbnail.156.jpg" />
  `;
  document.title = "7-Piece Acacia Wood Utensil Set";
  document.body.innerHTML = `
    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <div class="rounded-lg border">
        <div class="flex items-center gap-2 text-sm font-semibold">Product Details</div>
        <div class="flex items-center justify-between gap-4 border-b py-2">
          <div><span>Title</span></div>
          <div><span class="truncate">7-Piece Acacia Wood Utensil Set</span></div>
        </div>
        <img alt="product image" width="400" height="400" src="https://cdn.example.com/utensils.png" />
      </div>
      <div class="rounded-lg border">
        <h2>Shop Details</h2>
      </div>
    </div>
  `;
}

describe("Minea extraction", () => {
  it("uses the Product Details title instead of the generic og:title slogan", () => {
    mineaProductFixture();
    const product = extractMineaProduct();
    expect(product?.name).toBe("7-Piece Acacia Wood Utensil Set");
    expect(product?.source).toBe("details-title");
    expect(product?.images[0]).toBe("https://cdn.example.com/utensils.png");
    expect(
      isProductPage(product, "https://app.minea.com/en/products/06aac9d5-7bfc-7179-b08f-6431ca5c9157/details")
    ).toBe(true);
  });

  it("falls back to document.title when Product Details is missing", () => {
    document.head.innerHTML = `<meta property="og:title" content="Minea | Find your winning product in 3 clicks." />`;
    document.body.innerHTML = `<h2>Shop Details</h2><img alt="product image" width="400" height="400" src="https://cdn.example.com/utensils.png" />`;
    document.title = "7-Piece Acacia Wood Utensil Set | Minea";
    const product = extractMineaProduct();
    expect(product?.name).toBe("7-Piece Acacia Wood Utensil Set");
    expect(product?.source).toBe("document-title");
  });

  it("does not treat the dashboard as a product page", () => {
    document.title = "Minea";
    document.head.innerHTML = "";
    document.body.innerHTML = `<h1>Minea</h1>`;
    const product = extractMineaProduct();
    expect(isProductPage(product, "https://app.minea.com/")).toBe(false);
  });
});
