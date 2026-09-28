export const ZENDROP_ORIGIN = "https://app.zendrop.com";
export const ZENDROP_FILE_ORIGIN = "https://file.zendrop.com";
export const ZENDROP_PRODUCT_API = `${ZENDROP_ORIGIN}/api/product`;
export const ZENDROP_PRODUCT_SEARCH_PAGE = `${ZENDROP_ORIGIN}/product`;

export const MINEA_ORIGIN = "https://app.minea.com";

export const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
export const MIN_SEARCH_INTERVAL_MS = 750;
export const DETECTOR_DEBOUNCE_MS = 400;
export const MUTATION_DEBOUNCE_MS = 600;

export const DEFAULT_DESTINATION_COUNTRY = "US";

export const LOG_PREFIX = "[MZ]";

export const HOST_ELEMENT_ID = "mz-cost-finder-host";

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4
} as const;

export const GENERIC_MINEA_TITLES = [
  "minea",
  "dashboard",
  "home",
  "search",
  "login",
  "sign in",
  "catalog",
  "products",
  "explore",
  "trending",
  "settings",
  "account"
];

export const MINEA_SLOGAN_PATTERN = /find your winning product|adspy|3 clicks/i;

export const MINEA_UI_CHROME = new Set([
  "shop details",
  "product details",
  "ads for this product",
  "ads from this shop",
  "other products from this shop",
  "find suppliers",
  "unlock shop insights",
  "generate shopify store",
  "open in magic search",
  "download assets",
  "publication date",
  "category",
  "active ads",
  "total ads",
  "shopify apps",
  "title",
  "price"
]);

export const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "of",
  "in",
  "on",
  "with",
  "to",
  "from",
  "by",
  "as",
  "is",
  "its",
  "this",
  "that",
  "new",
  "best",
  "hot",
  "sale",
  "perfect",
  "style",
  "serving",
  "mixing"
]);

export const MATERIAL_TOKENS = new Set([
  "acacia",
  "teak",
  "oak",
  "bamboo",
  "wood",
  "wooden",
  "stainless",
  "steel",
  "plastic",
  "silicone",
  "glass",
  "cotton",
  "leather",
  "ceramic",
  "metal",
  "marble",
  "resin",
  "linen",
  "wool",
  "nylon",
  "rubber",
  "iron",
  "copper",
  "brass",
  "gold",
  "silver",
  "crystal",
  "velvet",
  "polyester",
  "fabric",
  "canvas",
  "aluminum",
  "aluminium",
  "carbon",
  "titanium"
]);

export const PRODUCT_TYPE_TOKENS = new Set([
  "utensil",
  "spatula",
  "set",
  "kit",
  "pack",
  "bundle",
  "holder",
  "organizer",
  "bottle",
  "mug",
  "cup",
  "lamp",
  "light",
  "charger",
  "stand",
  "case",
  "cover",
  "bag",
  "backpack",
  "wallet",
  "watch",
  "brush",
  "comb",
  "towel",
  "blanket",
  "pillow",
  "mat",
  "yoga",
  "dumbbell",
  "sticker",
  "poster",
  "print",
  "necklace",
  "bracelet",
  "earring",
  "ring",
  "shoe",
  "sneaker",
  "sock",
  "hat",
  "cap",
  "hoodie",
  "shirt",
  "dress",
  "pant",
  "jean",
  "jacket"
]);

export const IRREGULAR_STEMS: Record<string, string> = {
  wooden: "wood",
  woods: "wood",
  pieces: "piece",
  pcs: "piece",
  pc: "piece",
  utensils: "utensil",
  knives: "knife",
  leaves: "leaf",
  shelves: "shelf",
  brushes: "brush",
  watches: "watch",
  glasses: "glass",
  sets: "set"
};
