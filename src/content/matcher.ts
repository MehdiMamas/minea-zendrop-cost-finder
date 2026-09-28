import {
  CONFIDENCE_THRESHOLDS,
  IRREGULAR_STEMS,
  MATERIAL_TOKENS,
  PRODUCT_TYPE_TOKENS,
  STOP_WORDS
} from "../shared/constants";
import type { Confidence, MatchResult, MineaProduct, ProductMatcher, ZendropProduct } from "../shared/types";
import { extractCost } from "../shared/utils";

export function tokenize(title: string): string[] {
  const lowered = title.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const tokens = lowered
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (/^\d+$/.test(token)) return true;
      return token.length > 1 && !STOP_WORDS.has(token);
    })
    .map(stem);

  return tokens.filter(Boolean);
}

function stem(token: string): string {
  if (IRREGULAR_STEMS[token]) return IRREGULAR_STEMS[token];
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("es") && token.length > 4 && !token.endsWith("sses")) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

function isImportant(token: string): boolean {
  if (/^\d+$/.test(token)) return true;
  if (token === "piece" || token === "pack") return true;
  if (MATERIAL_TOKENS.has(token)) return true;
  if (PRODUCT_TYPE_TOKENS.has(token)) return true;
  if (/^\d+(cm|mm|in|inch|ft|oz|ml|lb)$/.test(token)) return true;
  return false;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function importantRecall(minea: string[], zendrop: Set<string>): number {
  const important = minea.filter(isImportant);
  if (important.length === 0) return 0;
  let hits = 0;
  for (const token of important) {
    if (zendrop.has(token)) hits += 1;
  }
  return hits / important.length;
}

function consecutiveBonus(minea: string[], zendrop: string[]): number {
  if (minea.length < 2 || zendrop.length < 2) return 0;
  const haystack = zendrop.join(" ");
  let best = 0;
  for (let size = Math.min(4, minea.length); size >= 2; size -= 1) {
    for (let i = 0; i <= minea.length - size; i += 1) {
      const phrase = minea.slice(i, i + size).join(" ");
      if (haystack.includes(phrase)) {
        best = Math.max(best, size / Math.min(6, minea.length));
      }
    }
    if (best > 0) break;
  }
  return Math.min(1, best);
}

function quantityBonus(minea: string[], zendrop: Set<string>): number {
  const quantity = minea.find((token) => /^\d+$/.test(token));
  return quantity && zendrop.has(quantity) ? 1 : 0;
}

export function scoreTitles(mineaTitle: string, zendropTitle: string): number {
  const mineaTokens = tokenize(mineaTitle);
  const zendropTokens = tokenize(zendropTitle);
  if (mineaTokens.length === 0 || zendropTokens.length === 0) return 0;

  const mineaSet = new Set(mineaTokens);
  const zendropSet = new Set(zendropTokens);

  const overlap = jaccard(mineaSet, zendropSet);
  const important = importantRecall(mineaTokens, zendropSet);
  const phrase = consecutiveBonus(mineaTokens, zendropTokens);
  const quantity = quantityBonus(mineaTokens, zendropSet);

  return Math.min(1, overlap * 0.5 + important * 0.25 + phrase * 0.15 + quantity * 0.1);
}

export function confidenceFromScore(score: number): Confidence {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "HIGH";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

export class TitleMatcher implements ProductMatcher {
  match(mineaProduct: MineaProduct, zendropProducts: ZendropProduct[]): MatchResult[] {
    return zendropProducts
      .map((product) => {
        const score = scoreTitles(mineaProduct.name, product.name);
        return {
          product,
          score,
          confidence: confidenceFromScore(score),
          cost: extractCost(product)
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

export class CompositeMatcher implements ProductMatcher {
  constructor(private readonly matchers: ProductMatcher[] = [new TitleMatcher()]) {}

  match(mineaProduct: MineaProduct, zendropProducts: ZendropProduct[]): MatchResult[] {
    const ranked = new Map<number, MatchResult>();
    for (const matcher of this.matchers) {
      for (const result of matcher.match(mineaProduct, zendropProducts)) {
        const existing = ranked.get(result.product.id);
        if (!existing || result.score > existing.score) {
          ranked.set(result.product.id, result);
        }
      }
    }
    return [...ranked.values()].sort((a, b) => b.score - a.score);
  }
}

export const defaultMatcher: ProductMatcher = new CompositeMatcher();
