import { describe, expect, it } from "vitest";
import { HOST_ELEMENT_ID } from "../src/shared/constants";
import { findProductDetailsCard, hostNeedsRemount, mountHostInPage } from "../src/content/mount";

describe("in-page mount", () => {
  it("inserts the host after the Product Details card", () => {
    document.body.innerHTML = `
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <div class="rounded-lg" id="details"><div>Product Details</div></div>
        <div class="rounded-lg" id="shop"><h2>Shop Details</h2></div>
      </div>
    `;
    const host = document.createElement("div");
    host.id = HOST_ELEMENT_ID;
    mountHostInPage(host);
    const details = document.getElementById("details");
    expect(findProductDetailsCard()?.id).toBe("details");
    expect(host.previousElementSibling).toBe(details);
    expect(host.nextElementSibling?.id).toBe("shop");
    expect(host.style.position).toBe("static");
    expect(hostNeedsRemount(host)).toBe(false);
  });
});
