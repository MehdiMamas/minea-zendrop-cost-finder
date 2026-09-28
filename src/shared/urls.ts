import { ZENDROP_FILE_ORIGIN, ZENDROP_ORIGIN, ZENDROP_PRODUCT_SEARCH_PAGE } from "./constants";
import type { ZendropProduct } from "./types";

const PRODUCT_PATH = /^\/product\/(\d+)\/?$/;
const FILE_HOST = new URL(ZENDROP_FILE_ORIGIN).hostname;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i;
const HASH_PATH = /^[a-f0-9]{2}\/[a-f0-9]{2}\/[a-z0-9]+\.(png|jpe?g|webp|gif|avif)$/i;

export function zendropSearchPageUrl(query: string): string {
  return `${ZENDROP_PRODUCT_SEARCH_PAGE}?page=1&search=${encodeURIComponent(query)}`;
}

export function zendropProductPageUrl(id: number, permalink?: string): string {
  if (permalink) {
    try {
      const url = new URL(permalink);
      if (url.origin === ZENDROP_ORIGIN) {
        const match = url.pathname.match(PRODUCT_PATH);
        if (match) return `${ZENDROP_ORIGIN}/product/${match[1]}`;
      }
    } catch {
      /* ignore invalid permalinks */
    }
  }
  return `${ZENDROP_ORIGIN}/product/${id}`;
}

export function zendropMatchUrl(product: Pick<ZendropProduct, "id" | "permalink">): string {
  return zendropProductPageUrl(product.id, product.permalink);
}

export function normalizeZendropImageUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:") return undefined;
      const host = url.hostname;
      const fromZendrop = host === FILE_HOST || host.endsWith(".zendrop.com");
      if (fromZendrop && (IMAGE_EXT.test(url.pathname) || url.pathname.includes("/products/"))) {
        return url.href;
      }
      if (IMAGE_EXT.test(url.pathname)) return url.href;
      return undefined;
    } catch {
      return undefined;
    }
  }

  const path = trimmed.replace(/^\/+/, "");
  if (path.startsWith("products/")) return `${ZENDROP_FILE_ORIGIN}/${path}`;
  if (HASH_PATH.test(path)) return `${ZENDROP_FILE_ORIGIN}/products/${path}`;
  if (IMAGE_EXT.test(path) && !path.includes(" ")) return `${ZENDROP_FILE_ORIGIN}/${path}`;
  return undefined;
}

export function pickZendropImage(urls: string[]): string | undefined {
  const normalized = urls
    .map(normalizeZendropImageUrl)
    .filter((value): value is string => Boolean(value));
  const fileHost = normalized.find((value) => {
    try {
      return new URL(value).hostname === FILE_HOST;
    } catch {
      return false;
    }
  });
  return fileHost ?? normalized[0];
}

export function isProxyableImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return parsed.hostname === FILE_HOST || parsed.hostname.endsWith(".zendrop.com");
  } catch {
    return false;
  }
}
