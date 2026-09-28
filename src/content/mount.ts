import { HOST_ELEMENT_ID } from "../shared/constants";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function findProductDetailsCard(root: ParentNode = document): HTMLElement | undefined {
  const nodes = root.querySelectorAll("div, h2, span, section, h3");
  for (const node of nodes) {
    if (normalizeText(node.textContent) !== "Product Details") continue;
    const card = node.closest("div.rounded-lg, [class*='rounded-lg'], section") as HTMLElement | null;
    if (card) return card;
    const nested = node.parentElement?.parentElement;
    if (nested instanceof HTMLElement) return nested;
  }
  return undefined;
}

export function findRightColumn(root: ParentNode = document): HTMLElement | undefined {
  const card = findProductDetailsCard(root);
  const parent = card?.parentElement;
  if (parent instanceof HTMLElement) return parent;
  const column = root.querySelector(".flex.min-w-0.flex-1.flex-col.gap-4");
  return column instanceof HTMLElement ? column : undefined;
}

export function applyInPageHostStyles(host: HTMLElement): void {
  host.style.position = "static";
  host.style.top = "";
  host.style.right = "";
  host.style.left = "";
  host.style.zIndex = "";
  host.style.width = "100%";
  host.style.display = "block";
  host.style.maxWidth = "100%";
}

export function mountHostInPage(host: HTMLElement, root: ParentNode = document): void {
  applyInPageHostStyles(host);
  const card = findProductDetailsCard(root);
  if (card) {
    if (host.previousElementSibling !== card) {
      card.insertAdjacentElement("afterend", host);
    }
    return;
  }
  const column = findRightColumn(root);
  if (column && host.parentElement !== column) {
    column.append(host);
    return;
  }
  if (host.isConnected) return;
  const body = "body" in root ? (root as Document).body : document.body;
  body.append(host);
}

export function hostNeedsRemount(host: HTMLElement | undefined, root: ParentNode = document): boolean {
  if (!host || !host.isConnected) return true;
  if (document.getElementById(HOST_ELEMENT_ID) !== host) return true;
  const card = findProductDetailsCard(root);
  if (card) return host.previousElementSibling !== card;
  return false;
}
