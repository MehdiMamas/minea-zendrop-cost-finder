import type { MineaProduct } from "../shared/types";
import { looksLikeGenericTitle, stripSiteSuffix } from "../shared/utils";

function titleLooksLikeProduct(title: string | undefined): boolean {
  if (!title) return false;
  const cleaned = stripSiteSuffix(title).trim();
  if (cleaned.length < 4) return false;
  return !looksLikeGenericTitle(cleaned) && !looksLikeGenericTitle(title);
}

function urlLooksLikeProduct(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return /\/products?\/|\/item\/|\/detail/i.test(pathname);
  } catch {
    return false;
  }
}

export function isProductPage(product: MineaProduct | undefined, url = location.href): boolean {
  if (!product) return false;
  if (!titleLooksLikeProduct(product.name)) return false;
  if (product.images.length > 0) return true;
  if (urlLooksLikeProduct(url)) return true;
  return product.name.split(/\s+/).length >= 3;
}

export function productIdentity(product: MineaProduct | undefined): string {
  if (!product) return "";
  return `${product.name}::${product.images[0] ?? ""}`;
}
