import { DETECTOR_DEBOUNCE_MS, MUTATION_DEBOUNCE_MS } from "../shared/constants";
import { logInfo } from "../shared/logger";
import type { ExtensionMessage } from "../shared/utils";
import type { SearchResponse, TabUiState } from "../shared/types";
import { debounce } from "../shared/utils";
import { isProductPage, productIdentity } from "./detector";
import { extractMineaProduct } from "./extractor";
import { defaultMatcher } from "./matcher";
import { clearDismissed, hide, initUi, reattachIfNeeded, showFromSearch, showLoading } from "./ui";

let lastIdentity = "";
let lastProductName = "";

function send<T>(message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response);
    });
  });
}

async function search(force = false): Promise<void> {
  const product = extractMineaProduct();
  if (!isProductPage(product) || !product) {
    lastIdentity = "";
    lastProductName = "";
    hide();
    return;
  }

  const identity = productIdentity(product);
  if (!force && identity === lastIdentity) {
    reattachIfNeeded();
    return;
  }

  lastIdentity = identity;
  lastProductName = product.name;
  logInfo("Minea product detected", { name: product.name, source: product.source });
  showLoading(product);

  try {
    logInfo("Searching Zendrop");
    const response = await send<SearchResponse>({
      type: "SEARCH_ZENDROP",
      query: product.name,
      force
    });
    const matches = response.ok ? defaultMatcher.match(product, response.products) : [];
    if (response.ok) {
      logInfo("Zendrop response received", {
        candidates: response.products.length,
        bestScore: matches[0]?.score,
        cost: matches[0]?.cost.amount
      });
    }
    showFromSearch(product, response, matches);
  } catch {
    showFromSearch(product, {
      ok: false,
      authenticated: true,
      error: "ZENDROP_SEARCH_FAILED",
      message: "Zendrop search failed."
    }, []);
  }
}

function publishState(state: TabUiState): void {
  void send({ type: "SET_TAB_STATE", state });
}

function watchSpa(): void {
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  const notify = () => window.dispatchEvent(new Event("mz-locationchange"));
  history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const result = originalPush(...args);
    notify();
    return result;
  }) as History["pushState"];
  history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const result = originalReplace(...args);
    notify();
    return result;
  }) as History["replaceState"];
  window.addEventListener("popstate", notify);
  window.addEventListener("mz-locationchange", () => {
    lastIdentity = "";
    clearDismissed();
    void search();
  });
}

initUi({
  onRefresh: () => void search(true),
  onOpenZendrop: (url) => void send({ type: "OPEN_ZENDROP", url }),
  onState: publishState
});

const debouncedSearch = debounce(() => void search(), DETECTOR_DEBOUNCE_MS);
const debouncedMutations = debounce(() => {
  reattachIfNeeded();
  const product = extractMineaProduct();
  if (product && product.name !== lastProductName) {
    lastIdentity = "";
    void search();
  }
}, MUTATION_DEBOUNCE_MS);

watchSpa();
void search();

const observer = new MutationObserver(debouncedMutations);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("focus", debouncedSearch);

chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "SEARCH_ZENDROP") void search(Boolean(message.force));
});
