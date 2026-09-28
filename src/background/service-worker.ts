import { TtlCache, searchCacheKey } from "../shared/cache";
import {
  MIN_SEARCH_INTERVAL_MS,
  ZENDROP_ORIGIN,
  ZENDROP_PRODUCT_API
} from "../shared/constants";
import { logInfo, logWarn } from "../shared/logger";
import { looksLikeAuthFailure, parseZendropJson, parseZendropProducts } from "../shared/parser";
import type { SearchResponse, TabUiState, ZendropProduct } from "../shared/types";
import { isProxyableImageUrl } from "../shared/urls";
import type { ExtensionMessage, ImageProxyResult, ZendropFetchResult } from "../shared/utils";
import { normalizeQuery, sleep } from "../shared/utils";

const cache = new TtlCache<SearchResponse>();
const inflight = new Map<string, Promise<SearchResponse>>();
const tabState = new Map<number, TabUiState>();
let lastSearchAt = 0;

async function waitForRateLimit(): Promise<void> {
  const wait = MIN_SEARCH_INTERVAL_MS - (Date.now() - lastSearchAt);
  if (wait > 0) await sleep(wait);
  lastSearchAt = Date.now();
}

function authFailure(): SearchResponse {
  return {
    ok: false,
    authenticated: false,
    error: "ZENDROP_AUTH_REQUIRED",
    message: "Zendrop session unavailable — open Zendrop and log in"
  };
}

function apiFailure(message = "Zendrop search failed."): SearchResponse {
  return {
    ok: false,
    authenticated: true,
    error: "ZENDROP_SEARCH_FAILED",
    message
  };
}

async function fetchProductById(id: number): Promise<ZendropProduct | undefined> {
  try {
    const res = await fetch(`${ZENDROP_PRODUCT_API}/${id}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json, text/plain, */*" }
    });
    const bodyText = await res.text();
    if (!res.ok || looksLikeAuthFailure(res.status, bodyText)) return undefined;
    const payload = parseZendropJson(bodyText);
    return parseZendropProducts(payload)[0];
  } catch {
    return undefined;
  }
}

async function attachMissingImages(products: ZendropProduct[]): Promise<ZendropProduct[]> {
  const missing = products.filter((product) => !product.featuredImageUrl).slice(0, 24);
  if (missing.length === 0) return products;

  const updates = new Map<number, ZendropProduct>();
  const queue = [...missing];
  const workerCount = Math.min(4, queue.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length) {
        const product = queue.shift();
        if (!product) return;
        const detailed = await fetchProductById(product.id);
        if (detailed?.featuredImageUrl) updates.set(product.id, detailed);
      }
    })
  );

  if (updates.size === 0) return products;
  logInfo("Hydrated Zendrop product images", { filled: updates.size });
  return products.map((product) => {
    const extra = updates.get(product.id);
    if (!extra?.featuredImageUrl) return product;
    return {
      ...product,
      featuredImageUrl: extra.featuredImageUrl,
      productImages: extra.productImages.length ? extra.productImages : product.productImages
    };
  });
}

async function fetchFromServiceWorker(query: string): Promise<{ status: number; bodyText: string } | undefined> {
  const url = `${ZENDROP_PRODUCT_API}?page=1&search=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json, text/plain, */*"
      }
    });
    return { status: res.status, bodyText: await res.text() };
  } catch {
    logWarn("Service worker Zendrop fetch failed");
    return undefined;
  }
}

async function fetchFromZendropTab(query: string): Promise<ZendropFetchResult> {
  const tabs = await chrome.tabs.query({ url: `${ZENDROP_ORIGIN}/*` });
  const tabId = tabs.find((tab) => typeof tab.id === "number")?.id;
  if (tabId == null) return { ok: false, error: "NO_TAB" };

  try {
    return await chrome.tabs.sendMessage(tabId, { type: "ZENDROP_FETCH", query } satisfies ExtensionMessage);
  } catch {
    return { ok: false, error: "NETWORK" };
  }
}

function toSearchResponse(query: string, status: number, bodyText: string, fromCache = false): SearchResponse {
  if (looksLikeAuthFailure(status, bodyText)) return authFailure();
  const payload = parseZendropJson(bodyText);
  if (payload == null) return apiFailure();

  const products = parseZendropProducts(payload);
  logInfo("Zendrop response received", {
    candidates: products.length,
    withImages: products.filter((product) => product.featuredImageUrl).length
  });
  return {
    ok: true,
    authenticated: true,
    query,
    products,
    fromCache
  };
}

async function searchZendrop(query: string, force = false): Promise<SearchResponse> {
  const normalized = normalizeQuery(query);
  const key = searchCacheKey(normalized);

  if (!force) {
    const cached = cache.get(key);
    if (cached) return cached.ok ? { ...cached, fromCache: true } : cached;
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const request = (async () => {
    await waitForRateLimit();
    logInfo("Searching Zendrop");

    const swResult = await fetchFromServiceWorker(query);
    if (swResult) {
      const parsed = toSearchResponse(query, swResult.status, swResult.bodyText);
      if (parsed.ok || parsed.authenticated) {
        if (parsed.ok) {
          const products = await attachMissingImages(parsed.products);
          const ready = { ...parsed, products };
          cache.set(key, ready);
          return ready;
        }
        return parsed;
      }
    }

    const tabResult = await fetchFromZendropTab(query);
    if (tabResult.ok) {
      const parsed = toSearchResponse(query, tabResult.status, tabResult.bodyText);
      if (parsed.ok) {
        const products = await attachMissingImages(parsed.products);
        const ready = { ...parsed, products };
        cache.set(key, ready);
        return ready;
      }
      return parsed;
    }

    if (swResult && looksLikeAuthFailure(swResult.status, swResult.bodyText)) return authFailure();
    if (tabResult.error === "NO_TAB") return authFailure();
    return apiFailure();
  })();

  inflight.set(key, request);
  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === "SEARCH_ZENDROP") {
    void searchZendrop(message.query, message.force).then(sendResponse);
    return true;
  }

  if (message.type === "SET_TAB_STATE") {
    const tabId = sender.tab?.id;
    if (typeof tabId === "number") tabState.set(tabId, message.state);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_TAB_STATE") {
    const tabId = message.tabId ?? sender.tab?.id;
    sendResponse(typeof tabId === "number" ? tabState.get(tabId) ?? { status: "idle" } : { status: "idle" });
    return true;
  }

  if (message.type === "OPEN_ZENDROP") {
    void chrome.tabs.create({ url: message.url });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "PROXY_IMAGE") {
    void proxyImage(message.url).then(sendResponse);
    return true;
  }

  return false;
});

async function proxyImage(url: string): Promise<ImageProxyResult> {
  if (!isProxyableImageUrl(url)) return { ok: false };
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return { ok: false };
    const mime = imageMime(res.headers.get("content-type"), url);
    if (!mime) return { ok: false };
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 2_000_000) return { ok: false };
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { ok: true, dataUrl: `data:${mime};base64,${btoa(binary)}` };
  } catch {
    logWarn("Zendrop image proxy failed");
    return { ok: false };
  }
}

function imageMime(contentType: string | null, url: string): string | undefined {
  const raw = contentType?.split(";")[0]?.trim().toLowerCase();
  if (raw?.startsWith("image/")) return raw;
  const match = url.match(/\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i);
  if (!match) return raw?.includes("octet-stream") ? "image/png" : undefined;
  const ext = match[1].toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return `image/${ext}`;
}
