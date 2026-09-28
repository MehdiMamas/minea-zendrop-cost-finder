import { z } from "zod";
import type { ZendropProduct } from "./types";
import { pickZendropImage } from "./urls";
import { toNumber, uniqueStrings } from "./utils";

const LooseRecord = z.record(z.unknown());

function asRecord(value: unknown): Record<string, unknown> | undefined {
  const parsed = LooseRecord.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function collectImageStrings(value: unknown, into: string[], depth = 0): void {
  if (value == null || depth > 8) return;
  if (typeof value === "string") {
    if (pickZendropImage([value])) into.push(value);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const item of value) collectImageStrings(item, into, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectImageStrings(nested, into, depth + 1);
    }
  }
}

function readPermalink(record: Record<string, unknown>): string | undefined {
  for (const key of ["permalink", "product_url", "productUrl"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function parseOneProduct(value: unknown): ZendropProduct | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const attributes = asRecord(record.attributes);
  const source = attributes ?? record;

  const name = typeof source.name === "string" ? source.name.trim() : typeof record.name === "string" ? record.name.trim() : "";
  const id = toNumber(source.id) ?? toNumber(record.id);
  if (!name || id == null) return undefined;

  const metrics = asRecord(source.metrics) ?? asRecord(record.metrics);
  const images: string[] = [];
  collectImageStrings(source, images);
  if (attributes) collectImageStrings(record, images);
  const productImages = uniqueStrings(images.map((item) => pickZendropImage([item]) ?? "").filter(Boolean));

  return {
    id,
    name,
    supplierId: toNumber(source.supplier_id) ?? toNumber(record.supplier_id),
    baseCostPrice: toNumber(source.base_cost_price) ?? toNumber(record.base_cost_price),
    displayPrice: toNumber(source.display_price) ?? toNumber(record.display_price),
    metricsCost: toNumber(metrics?.cost),
    featuredImageUrl: pickZendropImage(productImages),
    productImages,
    permalink: readPermalink(source) ?? readPermalink(record)
  };
}

function isHtmlPayload(payload: unknown, rawText?: string): boolean {
  if (typeof payload === "string") {
    const trimmed = payload.trim().slice(0, 32).toLowerCase();
    return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
  }
  if (rawText) {
    const trimmed = rawText.trim().slice(0, 32).toLowerCase();
    return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
  }
  return false;
}

export function parseZendropJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return undefined;
  }
}

export function looksLikeAuthFailure(status: number, rawText: string): boolean {
  if (status === 401 || status === 403) return true;
  return isHtmlPayload(undefined, rawText);
}

function mapProducts(values: unknown[]): ZendropProduct[] {
  return values.map(parseOneProduct).filter((item): item is ZendropProduct => Boolean(item));
}

/**
 * Zendrop product search returns an object whose `.data` field is the product array.
 * The parser still tolerates a top-level array, a single `data` object, and `products`.
 */
export function parseZendropProducts(response: unknown): ZendropProduct[] {
  if (Array.isArray(response)) return mapProducts(response);

  const record = asRecord(response);
  if (!record) return [];

  for (const key of ["data", "products", "results", "items"]) {
    const bucket = record[key];
    if (Array.isArray(bucket)) {
      const products = mapProducts(bucket);
      if (products.length) return products;
    }
    const single = parseOneProduct(bucket);
    if (single) return [single];
  }

  const self = parseOneProduct(record);
  return self ? [self] : [];
}
