/* The file is fetched once; saving/sharing always follows an explicit user gesture. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const button = byId("download-file");
  const status = byId("download-status");
  let token, saved = null, requestVersion = 0, controller;
  const sizeLabel = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;

  function clearSaved() {
    if (saved) {
      URL.revokeObjectURL(saved.url);
      if (saved.previewUrl !== saved.url) URL.revokeObjectURL(saved.previewUrl);
    }
    saved = null;
    byId("chart-preview").removeAttribute("src");
    byId("text-preview").textContent = "";
    for (const id of ["save-file", "open-file"]) byId(id).removeAttribute("href");
  }

  function selectToken() {
    requestVersion += 1;
    controller?.abort();
    clearSaved();
    token = new URLSearchParams(location.hash.slice(1)).get("token");
    const valid = /^[a-f0-9]{64}$/.test(token || "");
    button.hidden = !valid;
    button.disabled = false;
    button.textContent = "載入檔案";
    for (const id of ["file-result", "download-progress", "chart-preview", "text-preview", "share-file", "copy-text"]) byId(id).hidden = true;
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
    if (!response.body?.getReader) return response.blob();
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (version !== requestVersion) { await reader.cancel(); throw new DOMException("Aborted", "AbortError"); }
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total) progress.value = Math.min(received, total);
      byId("transfer-detail").textContent = total ? `已接收 ${sizeLabel(received)}／${sizeLabel(total)}` : `已接收 ${sizeLabel(received)}`;
    }
    return new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
  }

  function filenameFor(response, type) {
    const encoded = response.headers.get("content-disposition")?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    let name;
    try { name = encoded && decodeURIComponent(encoded); } catch { /* Keep the received file if metadata is malformed. */ }
    return (name || (type.includes("image/png") ? "八字命盤.png" : type.includes("markdown") ? "終身命理顧問.md" : "終身命理顧問.txt")).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
  }

  button.addEventListener("click", async () => {
    if (saved) return;
    const version = requestVersion;
    const requestController = new AbortController();
    controller = requestController;
    const timer = setTimeout(() => requestController.abort(), 60000);
    button.disabled = true;
    button.textContent = "正在載入…";
    byId("download-progress").hidden = false;
    byId("transfer-progress").removeAttribute("value");
    byId("transfer-detail").textContent = "等待伺服器準備檔案…";
    status.textContent = "檔案準備及傳輸中，請保持此頁開啟。";
    try {
      const response = await fetch(`/api/bazi/line/download?token=${encodeURIComponent(token)}`, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: requestController.signal });
      if (!response.ok) throw new Error(await response.text() || "載入失敗，請稍後重試。");
      const blob = await readFile(response, version);
      const filename = filenameFor(response, blob.type);
      const image = blob.type.startsWith("image/png");
      const text = image ? null : await blob.text();
      if (version !== requestVersion) return;
      const url = URL.createObjectURL(blob);
      const previewUrl = image ? url : URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      saved = { url, previewUrl, text, file: new File([blob], filename, { type: blob.type }) };
      byId("file-name").textContent = filename;
      byId("file-size").textContent = `${image ? "PNG 命盤圖" : filename.endsWith(".md") ? "Markdown 顧問檔案" : "文字顧問檔案"} · ${sizeLabel(blob.size)}`;
      byId("save-file").href = url;
      byId("save-file").download = filename;
      byId("open-file").href = previewUrl;
      let shareable = false;
      try { shareable = Boolean(navigator.share && navigator.canShare?.({ files: [saved.file] })); } catch { /* Show preview/save fallbacks. */ }
      byId("share-file").hidden = !shareable;
      if (image) { byId("chart-preview").src = url; byId("chart-preview").hidden = false; }
      else { byId("text-preview").textContent = text; byId("text-preview").hidden = false; byId("copy-text").hidden = false; }
      byId("file-result").hidden = false;
      byId("save-help").textContent = image
        ? "可長按下方命盤圖儲存。若有「分享／儲存到檔案」，也可選擇儲存至相片或檔案。"
        : "可在下方閱讀完整內容。「儲存檔案」會交由瀏覽器處理；也可使用系統分享、開啟檔案或複製全文。";
      byId("transfer-progress").max = 1;
      byId("transfer-progress").value = 1;
      byId("transfer-detail").textContent = `接收完成，共 ${sizeLabel(blob.size)}`;
      status.textContent = "檔案已載入本頁，尚未確認儲存至手機。請使用下方按鈕選擇儲存方式。";
      button.hidden = true;
      byId("external-browser").hidden = true; // The one-time server token is now consumed.
    } catch (error) {
      if (version === requestVersion) {
        status.textContent = error.name === "AbortError" ? "載入逾時或連線中斷，請重試；若連結已失效，請回 LINE 重新取得。" : error.message;
        byId("transfer-detail").textContent = "檔案尚未載入完成。";
        button.textContent = "重試載入";
      }
    } finally {
      clearTimeout(timer);
      if (version === requestVersion) button.disabled = false;
    }
  });

  byId("save-file").addEventListener("click", () => {
    status.textContent = "已送出儲存請求，請查看瀏覽器的下載項目。若 LINE 沒有顯示儲存選單，可改用系統分享，或直接使用下方預覽內容。";
  });
  byId("share-file").addEventListener("click", async () => {
    if (!saved) return;
    const shareButton = byId("share-file");
    shareButton.disabled = true;
    try {
      await navigator.share({ files: [saved.file], title: saved.file.name });
      status.textContent = "系統分享操作已結束，請到你選擇的儲存位置確認檔案。";
    } catch (error) {
      status.textContent = error.name === "AbortError" ? "已取消分享，檔案仍保留在本頁。" : "此瀏覽器無法分享此檔案，請改用儲存、開啟或下方預覽內容。";
    } finally { shareButton.disabled = false; }
  });
  byId("copy-text").addEventListener("click", async () => {
    if (!saved || saved.text === null) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(saved.text);
      else {
        const input = document.createElement("textarea"); input.value = saved.text; document.body.appendChild(input); input.select();
        const copied = document.execCommand("copy"); input.remove(); if (!copied) throw new Error("Copy unavailable");
      }
      status.textContent = "已複製完整顧問內容。";
    } catch { status.textContent = "無法自動複製，請在下方全文中選取並複製內容。"; }
  });
  selectToken();
  window.addEventListener("hashchange", selectToken);
  window.addEventListener("pagehide", event => { if (!event.persisted) { requestVersion += 1; controller?.abort(); clearSaved(); } });
})();
