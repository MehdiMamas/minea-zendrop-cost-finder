import { describe, expect, it } from "vitest";
import { looksLikeAuthFailure, parseZendropJson, parseZendropProducts } from "../src/shared/parser";

const sampleResponse = {
  data: [
    {
      id: 101,
      name: "Acacia Teak Wood Long-Handled Cooking Spatula Set – Perfect for Mixing & Serving in Style!",
      supplier_id: 9,
      base_cost_price: 0.65,
      display_price: 0.75,
      featured_image_url: "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png",
      metrics: { cost: 0.65 }
    },
    {
      id: 202,
      name: "7-Piece Wooden Kitchen Utensil Set",
      supplier_id: 9,
      base_cost_price: "2.98",
      display_price: 3.43,
      product_image: { url: "https://cdn.example.com/utensils.jpg" }
    }
  ]
};

describe("parseZendropProducts", () => {
  it("reads products from response.data", () => {
    const products = parseZendropProducts(sampleResponse);
    expect(products).toHaveLength(2);
    expect(products[0]?.name).toMatch(/Spatula Set/);
    expect(products[0]?.baseCostPrice).toBe(0.65);
    expect(products[0]?.displayPrice).toBe(0.75);
    expect(products[0]?.metricsCost).toBe(0.65);
    expect(products[0]?.productImages[0]).toBe(
      "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
    );
    expect(products[0]?.featuredImageUrl).toBe(
      "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
    );
    expect(products[1]?.baseCostPrice).toBe(2.98);
    expect(products[1]?.productImages[0]).toBe("https://cdn.example.com/utensils.jpg");
  });

  it("returns an empty list when data is missing", () => {
    expect(parseZendropProducts({ meta: {} })).toEqual([]);
    expect(parseZendropProducts(null)).toEqual([]);
  });

  it("skips malformed rows inside data", () => {
    const products = parseZendropProducts({
      data: [{ foo: 1 }, { id: 3, name: "Valid Product", base_cost_price: 1.5 }]
    });
    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe(3);
  });

  it("reads featured_image paths and nested image objects", () => {
    const products = parseZendropProducts({
      data: [
        {
          id: 9,
          name: "Nested Image Product",
          featured_image: "products/b5/0b/316759c6443296452ed913c92936.png"
        },
        {
          id: 10,
          name: "Object Image Product",
          image: { url: "https://file.zendrop.com/products/aa/bb/abc123.png" }
        }
      ]
    });
    expect(products[0]?.featuredImageUrl).toBe(
      "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
    );
    expect(products[1]?.featuredImageUrl).toBe("https://file.zendrop.com/products/aa/bb/abc123.png");
  });

  it("finds camelCase and buried original_url image fields", () => {
    const products = parseZendropProducts({
      data: [
        {
          id: 11,
          name: "Camel Case Image",
          featuredImage: "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
        },
        {
          id: 12,
          name: "Media Original",
          media: [{ original_url: "https://file.zendrop.com/products/cc/dd/zzzz.png" }]
        }
      ]
    });
    expect(products[0]?.featuredImageUrl).toContain("316759c6443296452ed913c92936.png");
    expect(products[1]?.featuredImageUrl).toContain("zzzz.png");
  });

  it("parses a single product object in data", () => {
    const products = parseZendropProducts({
      data: {
        id: 202,
        name: "7-Piece Wooden Kitchen Utensil Set",
        featuredImageUrl: "https://file.zendrop.com/products/b5/0b/316759c6443296452ed913c92936.png"
      }
    });
    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe(202);
    expect(products[0]?.featuredImageUrl).toContain("file.zendrop.com");
  });
});

describe("auth detection", () => {
  it("treats 401/403 and HTML login pages as auth failures", () => {
    expect(looksLikeAuthFailure(401, "{}")).toBe(true);
    expect(looksLikeAuthFailure(403, "{}")).toBe(true);
    expect(looksLikeAuthFailure(200, "<!DOCTYPE html><html>login</html>")).toBe(true);
    expect(looksLikeAuthFailure(200, JSON.stringify(sampleResponse))).toBe(false);
  });

  it("parses JSON text", () => {
    expect(parseZendropJson(JSON.stringify(sampleResponse))).toEqual(sampleResponse);
    expect(parseZendropJson("<html>")).toBeUndefined();
  });
});
