import type { MineaProduct } from "../shared/types";
import { isMineaUiChrome, looksLikeGenericTitle, stripSiteSuffix, uniqueStrings } from "../shared/utils";
import { findProductDetailsCard } from "./mount";

const IMAGE_EXCLUDE = /logo|avatar|icon|pixel|sprite|placeholder|tracking|favicon|emoji|thumbnail/i;
const GENERIC_OG_IMAGE = /\/_next\/static\/media\/thumbnail/i;

function readMeta(selector: string): string | undefined {
  const el = document.querySelector(selector);
  if (!el) return undefined;
  const content = el.getAttribute("content") || el.getAttribute("value");
  return content?.trim() || undefined;
}

function usableName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = stripSiteSuffix(value).trim();
  if (cleaned.length < 4) return undefined;
  if (looksLikeGenericTitle(cleaned) || looksLikeGenericTitle(value)) return undefined;
  if (isMineaUiChrome(cleaned)) return undefined;
  return cleaned;
}

function readProductDetailsTitle(): string | undefined {
  const scope: ParentNode = findProductDetailsCard() ?? document;
  const labels = scope.querySelectorAll("span, div, dt, th");
  for (const label of labels) {
    if ((label.textContent ?? "").replace(/\s+/g, " ").trim() !== "Title") continue;
    const row =
      label.closest("div.flex.items-center.justify-between") ??
      label.parentElement?.parentElement ??
      label.parentElement;
    if (!row) continue;
    const values = [...row.querySelectorAll("span, dd, td")]
      .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((text) => text && text !== "Title");
    for (const value of values) {
      const usable = usableName(value);
      if (usable) return usable;
    }
  }
  return undefined;
}

function readHeading(): string | undefined {
  const headings = [...document.querySelectorAll("h1, h2")];
  for (const heading of headings) {
    const usable = usableName(heading.textContent ?? undefined);
    if (usable) return usable;
  }
  return undefined;
}

function walkForProductName(value: unknown, depth = 0): string | undefined {
  if (depth > 8 || value == null) return undefined;
  if (typeof value === "string") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walkForProductName(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const type = String(record["@type"] ?? record.type ?? "");
  const name = record.name ?? record.title ?? record.productName ?? record.product_name;
  if (typeof name === "string") {
    const usable = usableName(name);
    if (usable && (/product/i.test(type) || record.featured_image || record.image || record.images)) {
      return usable;
    }
  }

  for (const nested of Object.values(record)) {
    const found = walkForProductName(nested, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function readNextDataName(): string | undefined {
  const script = document.querySelector("script#__NEXT_DATA__");
  if (!script?.textContent) return undefined;
  try {
    return walkForProductName(JSON.parse(script.textContent) as unknown);
  } catch {
    return undefined;
  }
}

function readJsonLdName(): string | undefined {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    if (!script.textContent) continue;
    try {
      const name = walkForProductName(JSON.parse(script.textContent) as unknown);
      if (name) return name;
    } catch {
      continue;
    }
  }
  return undefined;
}

function imageScore(img: HTMLImageElement): number {
  const src = img.currentSrc || img.src || "";
  const alt = img.alt || "";
  if (!src || IMAGE_EXCLUDE.test(src) || IMAGE_EXCLUDE.test(alt) || IMAGE_EXCLUDE.test(img.className)) {
    return -1;
  }
  if (GENERIC_OG_IMAGE.test(src) || src.startsWith("data:image/svg")) return -1;
  const width = img.naturalWidth || Number(img.getAttribute("width")) || img.width || 0;
  const height = img.naturalHeight || Number(img.getAttribute("height")) || img.height || 0;
  if (width && height && (width < 80 || height < 80)) return -1;
  let score = width * height || 1;
  if (/product image/i.test(alt)) score += 1_000_000;
  return score;
}

function collectImages(): string[] {
  const urls: string[] = [];
  const ranked = [...document.querySelectorAll("img")]
    .map((img) => ({ img, score: imageScore(img) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { img } of ranked) {
    const src = img.currentSrc || img.src;
    if (src) urls.push(src);
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const last = srcset.split(",").at(-1)?.trim().split(/\s+/)[0];
      if (last) urls.push(last);
    }
  }

  return uniqueStrings(urls).slice(0, 8);
}

export function extractMineaProduct(): MineaProduct | undefined {
  const detailsTitle = readProductDetailsTitle();
  const documentTitle = usableName(document.title);
  const heading = readHeading();
  const nextName = readNextDataName();
  const jsonLd = readJsonLdName();
  const ogTitle = usableName(readMeta('meta[property="og:title"]'));

  const candidates: Array<{ name: string; source: MineaProduct["source"] }> = [];
  if (detailsTitle) candidates.push({ name: detailsTitle, source: "details-title" });
  if (documentTitle) candidates.push({ name: documentTitle, source: "document-title" });
  if (jsonLd) candidates.push({ name: jsonLd, source: "json-ld" });
  if (nextName) candidates.push({ name: nextName, source: "next-data" });
  if (heading) candidates.push({ name: heading, source: "heading" });
  if (ogTitle) candidates.push({ name: ogTitle, source: "mixed" });

  const chosen = candidates[0];
  if (!chosen) return undefined;

  return {
    name: chosen.name,
    images: collectImages(),
    url: location.href,
    source: chosen.source
  };
}
