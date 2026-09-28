import { GENERIC_MINEA_TITLES, MINEA_SLOGAN_PATTERN, MINEA_UI_CHROME } from "./constants";
import type { CostInfo, ZendropProduct } from "./types";

export type ExtensionMessage =
  | { type: "SEARCH_ZENDROP"; query: string; force?: boolean }
  | { type: "GET_TAB_STATE"; tabId?: number }
  | { type: "SET_TAB_STATE"; state: import("./types").TabUiState }
  | { type: "ZENDROP_FETCH"; query: string }
  | { type: "OPEN_ZENDROP"; url: string }
  | { type: "PROXY_IMAGE"; url: string };

export type ZendropFetchResult =
  | { ok: true; status: number; bodyText: string }
  | { ok: false; status?: number; error: "NETWORK" | "NO_TAB" };

export type ImageProxyResult = { ok: true; dataUrl: string } | { ok: false };

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number
): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  }) as T;
  return wrapped;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function stripSiteSuffix(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*Minea.*$/i, "")
    .replace(/\s*•\s*Minea.*$/i, "")
    .trim();
}

export function looksLikeGenericTitle(title: string): boolean {
  const raw = title.trim();
  if (raw.length < 4) return true;
  if (MINEA_SLOGAN_PATTERN.test(raw)) return true;
  const cleaned = stripSiteSuffix(raw).trim().toLowerCase();
  if (cleaned.length < 4) return true;
  if (GENERIC_MINEA_TITLES.includes(cleaned)) return true;
  if (/^minea(\b|$)/i.test(cleaned) && cleaned.split(/\s+/).length <= 3) return true;
  return false;
}

export function isMineaUiChrome(text: string | undefined): boolean {
  if (!text) return true;
  return MINEA_UI_CHROME.has(text.trim().toLowerCase());
}

export function extractCost(product: ZendropProduct): CostInfo {
  if (typeof product.baseCostPrice === "number") {
    return {
      amount: product.baseCostPrice,
      label: "Product cost",
      source: "base_cost_price",
      costUnavailable: false
    };
  }

  if (typeof product.metricsCost === "number") {
    return {
      amount: product.metricsCost,
      label: "Product cost",
      source: "metrics.cost",
      costUnavailable: false
    };
  }

  if (typeof product.displayPrice === "number") {
    return {
      amount: product.displayPrice,
      label: "Zendrop displayed price",
      source: "display_price",
      costUnavailable: true
    };
  }

  return {
    label: "Cost",
    source: "none",
    costUnavailable: true
  };
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
