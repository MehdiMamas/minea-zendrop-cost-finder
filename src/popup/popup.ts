import { ZENDROP_ORIGIN } from "../shared/constants";
import type { TabUiState } from "../shared/types";
import { formatUsd } from "../shared/utils";

const productEl = document.getElementById("product")!;
const matchEl = document.getElementById("match")!;
const costEl = document.getElementById("cost")!;
const confidenceEl = document.getElementById("confidence")!;
const statusEl = document.getElementById("status")!;

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(state: TabUiState | undefined): void {
  if (!state || state.status === "idle") {
    productEl.textContent = "Open a Minea product page";
    matchEl.textContent = "—";
    costEl.textContent = "—";
    confidenceEl.textContent = "—";
    statusEl.textContent = "";
    return;
  }

  productEl.textContent = state.mineaProductName ?? "Could not identify this Minea product.";
  matchEl.textContent = state.bestMatchName ?? "—";
  costEl.textContent =
    typeof state.costAmount === "number" ? `${state.costLabel ?? "Cost"} ${formatUsd(state.costAmount)}` : "—";
  confidenceEl.textContent = state.confidence ?? "—";

  if (state.status === "auth") {
    statusEl.textContent = "Zendrop session unavailable. Log in to Zendrop and refresh.";
  } else if (state.status === "empty") {
    statusEl.textContent = "No Zendrop products found.";
  } else if (state.status === "error") {
    statusEl.textContent = "Zendrop search failed.";
  } else if (state.status === "loading") {
    statusEl.textContent = "Searching Zendrop…";
  } else {
    statusEl.textContent = "";
  }
}

async function load(): Promise<void> {
  const tab = await activeTab();
  if (!tab?.id) return;
  const state = await chrome.runtime.sendMessage({ type: "GET_TAB_STATE", tabId: tab.id });
  render(state);
}

document.getElementById("refresh")?.addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "SEARCH_ZENDROP", query: "", force: true });
  window.close();
});

document.getElementById("open")?.addEventListener("click", async () => {
  const tab = await activeTab();
  const state: TabUiState | undefined = tab?.id
    ? await chrome.runtime.sendMessage({ type: "GET_TAB_STATE", tabId: tab.id })
    : undefined;
  const url = state?.zendropProductUrl ?? state?.zendropSearchUrl ?? ZENDROP_ORIGIN;
  await chrome.runtime.sendMessage({ type: "OPEN_ZENDROP", url });
});

void load();
