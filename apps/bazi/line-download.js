/* Load once, then retain visible preview/save actions without reusing the server token. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const button = byId("download-file");
  const status = byId("download-status");
  if (typeof BaziFileDelivery === "undefined") {
    button.disabled = true;
    status.textContent = "下載功能未能載入，請重新載入頁面後再試。";
    byId("reload-page").hidden = false;
    return;
  }
  const delivery = BaziFileDelivery.mount(byId("file-result"), message => { status.textContent = message; });
  const sizeLabel = BaziFileDelivery.sizeLabel;
  let token, requestVersion = 0, controller, loading = false;
  function selectToken() {
    requestVersion += 1;
    controller?.abort();
    loading = false;
    delivery.reset();
    token = new URLSearchParams(location.hash.slice(1)).get("token");
    const valid = /^[a-f0-9]{64}$/.test(token || "");
    button.hidden = !valid;
    button.disabled = false;
    button.textContent = "載入檔案";
    byId("download-progress").hidden = true;
    byId("reload-page").hidden = true;
    status.textContent = valid ? "尚未載入檔案。連結有使用期限，請在有效期間內載入。" : "下載連結不完整，請回到 LINE 重新取得。";
    const external = byId("external-browser");
    const url = new URL(location.href);
    url.searchParams.set("openExternalBrowser", "1");
    external.href = url.href;
    external.hidden = !valid;
  }
  async function readFile(response, version) {
    const declared = Number(response.headers.get("content-length"));
    const total = !response.headers.get("content-encoding") && declared > 0 ? declared : null;
    const progress = byId("transfer-progress");
    if (total) { progress.max = total; progress.value = 0; }
    else progress.removeAttribute("value");
    if (!response.body?.getReader) {
      const blob = await response.blob();
      if (total && blob.size !== total) throw new Error("檔案傳輸不完整，請回 LINE 重新取得下載連結。");
      return blob;
    }
    const reader = response.body.getReader(), chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (version !== requestVersion) { await reader.cancel(); throw new DOMException("Aborted", "AbortError"); }
      if (done) break;
      chunks.push(value); received += value.byteLength;
      if (total) progress.value = Math.min(received, total);
      byId("transfer-detail").textContent = total ? `已接收 ${sizeLabel(received)}／${sizeLabel(total)}` : `已接收 ${sizeLabel(received)}`;
    }
    if (total && received !== total) throw new Error("檔案傳輸不完整，請回 LINE 重新取得下載連結。");
    return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
  }
  function filenameFor(response, type) {
    const encoded = response.headers.get("content-disposition")?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    let name;
    try { name = encoded && decodeURIComponent(encoded); } catch { /* Keep valid file bytes despite bad metadata. */ }
    return name || (type.startsWith("image/png") ? "八字命盤.png" : type.includes("markdown") ? "終身命理顧問.md" : "終身命理顧問.txt");
  }
  button.addEventListener("click", async () => {
    if (loading || button.hidden) return;
    loading = true;
    const version = requestVersion, requestController = new AbortController();
    controller = requestController;
    const timer = setTimeout(() => requestController.abort(), 60000);
    button.disabled = true; button.textContent = "正在載入…";
    byId("download-progress").hidden = false;
    byId("transfer-progress").removeAttribute("value");
    byId("transfer-detail").textContent = "等待伺服器準備檔案…";
    byId("external-browser").hidden = true;
    status.textContent = "檔案準備及傳輸中，請保持此頁開啟。";
    let receivedSuccess = false;
    try {
      const response = await fetch(`/api/bazi/line/download?token=${encodeURIComponent(token)}`, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: requestController.signal });
      if (version !== requestVersion) return;
      if (!response.ok) {
        const error = new Error([400,401,403,404,410].includes(response.status)
          ? "下載連結無效、已使用或資料已更新，請回 LINE 重新取得連結。"
          : response.status === 409 ? "此連結正在下載，請稍候再試。" : "伺服器暫時無法提供檔案，請稍後重試。");
        error.terminal = [400,401,403,404,410].includes(response.status);
        throw error;
      }
      receivedSuccess = true; // The one-time token may already be consumed even if transfer later fails.
      const blob = await readFile(response, version);
      if (version !== requestVersion) return;
      if (!await delivery.show(blob, filenameFor(response, blob.type))) return;
      if (version !== requestVersion) return;
      byId("transfer-progress").max = 1; byId("transfer-progress").value = 1;
      byId("transfer-detail").textContent = `接收完成，共 ${sizeLabel(blob.size)}`;
      button.hidden = true;
    } catch (error) {
      if (version === requestVersion) {
        const terminal = receivedSuccess || error.terminal;
        status.textContent = error.name === "AbortError"
          ? "載入逾時或連線中斷，請回 LINE 重新取得連結。"
          : error instanceof TypeError ? "網路連線失敗，請確認網路後重試；若連結已使用，請回 LINE 重新取得。" : error.message;
        if (receivedSuccess) status.textContent += " 此次連結已送出檔案，請回 LINE 取得新連結。";
        byId("transfer-detail").textContent = "檔案尚未載入完成。";
        button.hidden = Boolean(terminal);
        button.textContent = "重試載入";
        byId("external-browser").hidden = Boolean(terminal);
      }
    } finally {
      clearTimeout(timer);
      if (version === requestVersion) { loading = false; button.disabled = false; }
    }
  });
  selectToken();
  window.addEventListener("hashchange", selectToken);
  window.addEventListener("pagehide", event => { if (!event.persisted) { requestVersion += 1; controller?.abort(); } });
})();
