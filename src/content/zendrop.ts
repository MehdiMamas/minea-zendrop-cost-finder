import type { ExtensionMessage, ZendropFetchResult } from "../shared/utils";

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type !== "ZENDROP_FETCH") return;

  const url = `/api/product?page=1&search=${encodeURIComponent(message.query)}`;
  fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json, text/plain, */*"
    }
  })
    .then(async (res) => {
      const bodyText = await res.text();
      const result: ZendropFetchResult = { ok: true, status: res.status, bodyText };
      sendResponse(result);
    })
    .catch(() => {
      const result: ZendropFetchResult = { ok: false, error: "NETWORK" };
      sendResponse(result);
    });

  return true;
});
