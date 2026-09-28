import { SEARCH_CACHE_TTL_MS } from "./constants";

export type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs = SEARCH_CACHE_TTL_MS) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export function searchCacheKey(normalizedQuery: string): string {
  return `zendrop-search:${normalizedQuery}`;
}
