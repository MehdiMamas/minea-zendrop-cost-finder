import styles from "./card.css?raw";
import { HOST_ELEMENT_ID } from "../shared/constants";
import { DEFAULT_DESTINATION_COUNTRY, UnavailableShippingLookup } from "../shared/shipping";
import type { MatchResult, MineaProduct, SearchResponse, TabUiState } from "../shared/types";
import type { ExtensionMessage, ImageProxyResult } from "../shared/utils";
import { formatUsd } from "../shared/utils";
import { zendropMatchUrl, zendropSearchPageUrl } from "../shared/urls";
import { hostNeedsRemount, mountHostInPage } from "./mount";

const shippingLookup = new UnavailableShippingLookup();

export type CardCallbacks = {
  onRefresh: () => void;
  onOpenZendrop: (url: string) => void;
  onState: (state: TabUiState) => void;
};

type CardModel =
  | { kind: "hidden" }
  | { kind: "loading"; product: MineaProduct }
  | { kind: "auth"; product?: MineaProduct }
  | { kind: "error"; product?: MineaProduct; message: string }
  | { kind: "empty"; product: MineaProduct }
  | { kind: "ready"; product: MineaProduct; matches: MatchResult[] };

let host: HTMLElement | undefined;
let shadow: ShadowRoot | undefined;
let card: HTMLElement | undefined;
let callbacks: CardCallbacks | undefined;
let model: CardModel = { kind: "hidden" };
let dismissedFor = "";
let sellingPrice = "29.99";

function ensureHost(): ShadowRoot {
  let existing = document.getElementById(HOST_ELEMENT_ID);
  if (!existing) {
    existing = document.createElement("div");
    existing.id = HOST_ELEMENT_ID;
  }
  mountHostInPage(existing);
  host = existing;
  if (!existing.shadowRoot) {
    shadow = existing.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    shadow.append(style);
    card = document.createElement("section");
    card.id = "mz-card";
    shadow.append(card);
  } else {
    shadow = existing.shadowRoot;
    card = shadow.getElementById("mz-card") as HTMLElement;
  }
  return shadow;
}

function emitState(): void {
  if (!callbacks) return;
  if (model.kind === "hidden") {
    callbacks.onState({ status: "idle" });
    return;
  }

  const productName = "product" in model ? model.product?.name : undefined;
  const best = model.kind === "ready" ? model.matches[0] : undefined;
  callbacks.onState({
    mineaProductName: productName,
    bestMatchName: best?.product.name,
    costLabel: best?.cost.label,
    costAmount: best?.cost.amount,
    confidence: best?.confidence,
    status:
      model.kind === "loading"
        ? "loading"
        : model.kind === "auth"
          ? "auth"
          : model.kind === "empty"
            ? "empty"
            : model.kind === "error"
              ? "error"
              : "ready",
    zendropSearchUrl: productName ? zendropSearchPageUrl(productName) : undefined,
    zendropProductUrl: best ? zendropMatchUrl(best.product) : undefined
  });
}

function bind(): void {
  if (!card || !callbacks) return;
  card.querySelector("[data-action=close]")?.addEventListener("click", dismiss);
  card.querySelector("[data-action=refresh]")?.addEventListener("click", () => callbacks?.onRefresh());
  card.querySelectorAll<HTMLElement>("[data-open-url]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const url = el.getAttribute("data-open-url");
      if (url) callbacks?.onOpenZendrop(url);
    });
  });
  const input = card.querySelector<HTMLInputElement>("[data-selling-price]");
  input?.addEventListener("input", () => {
    sellingPrice = input.value;
    render();
  });
  bindImageProxy();
}

function bindImageProxy(): void {
  if (!card) return;
  card.querySelectorAll<HTMLImageElement>("img[data-zendrop-image]").forEach((img) => {
    const url = img.getAttribute("data-zendrop-image");
    if (!url) return;

    const apply = (dataUrl: string) => {
      img.src = dataUrl;
    };

    chrome.runtime.sendMessage({ type: "PROXY_IMAGE", url } satisfies ExtensionMessage, (result: ImageProxyResult) => {
      if (chrome.runtime.lastError || !result?.ok) return;
      apply(result.dataUrl);
    });

    img.addEventListener(
      "error",
      () => {
        chrome.runtime.sendMessage({ type: "PROXY_IMAGE", url } satisfies ExtensionMessage, (result: ImageProxyResult) => {
          if (chrome.runtime.lastError || !result?.ok) return;
          apply(result.dataUrl);
        });
      },
      { once: true }
    );
  });
}

function shippingCopy(productId: number): string {
  void shippingLookup.getShippingCost({
    productId: String(productId),
    destinationCountry: DEFAULT_DESTINATION_COUNTRY
  });
  return "Not retrieved";
}

function matchImage(match: MatchResult): string | undefined {
  return match.product.featuredImageUrl || match.product.productImages[0];
}

function costSummary(match: MatchResult): string {
  if (typeof match.cost.amount === "number") {
    return `${match.cost.costUnavailable ? "Displayed" : "Cost"} ${formatUsd(match.cost.amount)}`;
  }
  return "Cost unavailable";
}

function matchRowHtml(match: MatchResult, index: number): string {
  const image = matchImage(match);
  const top = index < 3;
  const url = zendropMatchUrl(match.product);
  const display =
    typeof match.product.displayPrice === "number" && match.cost.source !== "display_price"
      ? `<span class="mz-meta">Display ${formatUsd(match.product.displayPrice)}</span>`
      : "";
  const shipping = top
    ? `<span class="mz-meta">Shipping (${DEFAULT_DESTINATION_COUNTRY}): ${shippingCopy(match.product.id)}</span>`
    : "";

  return `
    <li class="mz-match ${top ? "mz-match-top" : ""}" data-open-url="${escapeHtml(url)}">
      ${
        image
          ? `<img class="mz-thumb" alt="" src="${escapeHtml(image)}" data-zendrop-image="${escapeHtml(image)}" referrerpolicy="no-referrer" />`
          : `<div class="mz-thumb mz-thumb-empty" aria-hidden="true"></div>`
      }
      <div class="mz-match-body">
        <div class="mz-match-head">
          ${top ? `<span class="mz-rank">TOP ${index + 1}</span>` : `<span class="mz-rank muted">#${index + 1}</span>`}
          <span class="mz-badge">${match.confidence} · ${Math.round(match.score * 100)}%</span>
        </div>
        <p class="mz-match-name">${escapeHtml(match.product.name)}</p>
        <div class="mz-meta-row">
          <span class="mz-meta strong">${costSummary(match)}</span>
          ${display}
          ${shipping}
        </div>
        <button type="button" class="mz-link" data-open-url="${escapeHtml(url)}">Open product</button>
      </div>
    </li>
  `;
}

function calculatorHtml(match?: MatchResult): string {
  return `
    <details class="mz-calc">
      <summary>Selling price helper</summary>
      <label class="mz-field">
        Selling price
        <input data-selling-price type="number" min="0" step="0.01" value="${sellingPrice}" />
      </label>
      <p class="mz-status">${
        match && !match.cost.costUnavailable
          ? "Margin: Cannot calculate until shipping is known."
          : "Do not treat this as a profitability score. Shipping is not retrieved in MVP."
      }</p>
    </details>
  `;
}

function headerHtml(): string {
  return `<div class="mz-header"><div class="mz-kicker">Zendrop Cost Finder</div><button class="mz-close" data-action="close" aria-label="Dismiss">×</button></div>`;
}

function render(): void {
  if (model.kind === "hidden") {
    host?.remove();
    host = undefined;
    shadow = undefined;
    card = undefined;
    emitState();
    return;
  }

  ensureHost();
  if (!card) return;

  if (model.kind === "loading") {
    card.innerHTML = `
      ${headerHtml()}
      <p class="mz-title">${escapeHtml(model.product.name)}</p>
      <p class="mz-status">Searching Zendrop…</p>
    `;
  } else if (model.kind === "auth") {
    const searchUrl = model.product ? zendropSearchPageUrl(model.product.name) : "https://app.zendrop.com";
    card.innerHTML = `
      ${headerHtml()}
      ${model.product ? `<p class="mz-title">${escapeHtml(model.product.name)}</p>` : ""}
      <p class="mz-status error">Zendrop session unavailable — open Zendrop and log in</p>
      <div class="mz-actions">
        <button class="mz-btn primary" data-open-url="${escapeHtml(searchUrl)}">Open Zendrop</button>
        <button class="mz-btn" data-action="refresh">Refresh</button>
      </div>
    `;
  } else if (model.kind === "error") {
    card.innerHTML = `
      ${headerHtml()}
      <p class="mz-status error">Zendrop search failed.</p>
      <div class="mz-actions"><button class="mz-btn" data-action="refresh">Retry</button></div>
    `;
  } else if (model.kind === "empty") {
    const searchUrl = zendropSearchPageUrl(model.product.name);
    card.innerHTML = `
      ${headerHtml()}
      <p class="mz-title">${escapeHtml(model.product.name)}</p>
      <p class="mz-status">No Zendrop products found. Try searching manually in Zendrop.</p>
      <div class="mz-actions">
        <button class="mz-btn primary" data-open-url="${escapeHtml(searchUrl)}">Search Zendrop</button>
        <button class="mz-btn" data-action="refresh">Refresh</button>
      </div>
    `;
  } else {
    const searchUrl = zendropSearchPageUrl(model.product.name);
    card.innerHTML = `
      ${headerHtml()}
      <p class="mz-label">Minea product</p>
      <p class="mz-title">${escapeHtml(model.product.name)}</p>
      <p class="mz-label">Ranked Zendrop matches · ${model.matches.length} result${model.matches.length === 1 ? "" : "s"}</p>
      <ul class="mz-list">${model.matches.map((match, index) => matchRowHtml(match, index)).join("")}</ul>
      <div class="mz-actions">
        <button class="mz-btn" data-open-url="${escapeHtml(searchUrl)}">Search Zendrop</button>
        <button class="mz-btn" data-action="refresh">Refresh</button>
      </div>
      ${calculatorHtml(model.matches[0])}
    `;
  }

  bind();
  emitState();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function hide(): void {
  model = { kind: "hidden" };
  render();
}

export function dismiss(): void {
  if ("product" in model && model.product) dismissedFor = model.product.name;
  hide();
}

export function clearDismissed(): void {
  dismissedFor = "";
}

export function initUi(next: CardCallbacks): void {
  callbacks = next;
}

export function showLoading(product: MineaProduct): void {
  if (dismissedFor === product.name) return;
  model = { kind: "loading", product };
  render();
}

export function showFromSearch(product: MineaProduct, response: SearchResponse, matches: MatchResult[]): void {
  if (dismissedFor === product.name) return;
  if (!response.ok && !response.authenticated) {
    model = { kind: "auth", product };
  } else if (!response.ok) {
    model = { kind: "error", product, message: response.message };
  } else if (matches.length === 0) {
    model = { kind: "empty", product };
  } else {
    model = { kind: "ready", product, matches };
  }
  render();
}

export function reattachIfNeeded(): void {
  if (model.kind === "hidden") return;
  if (hostNeedsRemount(host)) {
    host = undefined;
    shadow = undefined;
    card = undefined;
    render();
  }
}
