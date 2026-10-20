/* Shared, explicit save/preview actions for website and LINE exports. */
(function (root) {
  "use strict";
  const sizeLabel = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
  function mount(container, onStatus) {
    container.innerHTML = `<h2 data-file="name" tabindex="-1"></h2><p data-file="size"></p>
      <div class="file-actions"><button data-file="share" type="button" hidden>分享／儲存到檔案</button>
      <a data-file="save" class="file-action">儲存檔案</a><a data-file="open" class="file-action" target="_blank" rel="noopener noreferrer">開啟檔案</a>
      <button data-file="copy" type="button" hidden>複製全文</button></div>
      <p data-file="help"></p><img data-file="image" alt="八字命盤細盤預覽" hidden>
      <pre data-file="text" tabindex="0" aria-label="顧問檔案全文" hidden></pre>`;
    const el = name => container.querySelector(`[data-file="${name}"]`);
    let current = null, version = 0;
    function reset() {
      version += 1;
      if (current) {
        URL.revokeObjectURL(current.url);
        if (current.previewUrl !== current.url) URL.revokeObjectURL(current.previewUrl);
      }
      current = null;
      container.hidden = true;
      el("image").removeAttribute("src");
      el("text").textContent = "";
      el("name").textContent = "";
      el("size").textContent = "";
      for (const name of ["save", "open"]) el(name).removeAttribute("href");
      for (const name of ["share", "copy"]) { el(name).disabled = false; el(name).hidden = true; }
    }
    async function show(blob, filename) {
      reset();
      const selectedVersion = version;
      const type = blob.type.split(";")[0].toLowerCase();
      const image = type === "image/png";
      if (!["image/png", "text/plain", "text/markdown"].includes(type) || !blob.size) throw new Error("收到的檔案格式不正確或內容為空，請重新取得連結。");
      if (image) {
        const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        if (signature.join(",") !== "137,80,78,71,13,10,26,10") throw new Error("收到的 PNG 圖檔不完整，請重新取得連結。");
      }
      const text = image ? null : await blob.text();
      if (selectedVersion !== version) return false;
      const safeName = String(filename || (image ? "八字命盤.png" : "終身命理顧問.txt")).replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_");
      const url = URL.createObjectURL(blob);
      const previewUrl = image ? url : URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      let file = null;
      try { file = new File([blob], safeName, { type: blob.type }); } catch { /* File sharing is optional on older mobile browsers. */ }
      current = { url, previewUrl, text, file };
      el("name").textContent = safeName;
      el("size").textContent = `${image ? "PNG 命盤圖" : type === "text/markdown" ? "Markdown 顧問檔案" : "文字顧問檔案"} · ${sizeLabel(blob.size)}`;
      el("save").href = url;
      el("save").download = safeName;
      el("open").href = previewUrl;
      let shareable = false;
      try { shareable = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] })); } catch { /* Keep other actions usable. */ }
      el("share").hidden = !shareable;
      el("copy").hidden = image;
      el("image").hidden = !image;
      el("text").hidden = image;
      if (image) el("image").src = url;
      else el("text").textContent = text;
      el("help").textContent = image
        ? "可長按下方命盤圖儲存。也可使用系統分享選擇儲存位置，或按「儲存檔案」後查看瀏覽器下載項目。"
        : "下方可閱讀完整內容。可使用系統分享選擇儲存位置，或按「儲存檔案」後查看瀏覽器下載項目；亦可開啟或複製全文。";
      container.hidden = false;
      onStatus("檔案已準備完成。請按「儲存檔案」或使用系統分享，選擇手機上的儲存位置。");
      return true;
    }
    el("save").addEventListener("click", () => {
      if (current) onStatus("已送出儲存請求，請查看瀏覽器的下載項目。若未出現檔案，可使用系統分享或下方預覽；本頁無法確認手機是否完成儲存。");
    });
    el("share").addEventListener("click", async () => {
      if (!current?.file) return;
      const selected = current, selectedVersion = version;
      el("share").disabled = true;
      try {
        await navigator.share({ files: [selected.file], title: selected.file.name });
        if (selectedVersion === version) onStatus("系統分享操作已結束，請到你選擇的儲存位置確認檔案。");
      } catch (error) {
        if (selectedVersion === version) onStatus(error.name === "AbortError" ? "已取消分享，檔案仍保留在本頁。" : "此瀏覽器無法分享此檔案，請改用儲存、開啟或下方預覽內容。");
      } finally { if (selectedVersion === version) el("share").disabled = false; }
    });
    el("copy").addEventListener("click", async () => {
      if (!current || current.text === null) return;
      const selected = current, selectedVersion = version;
      el("copy").disabled = true;
      try {
        let copied = false;
        try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(selected.text); copied = true; } } catch { /* Try the older clipboard path as well. */ }
        if (selectedVersion !== version) return;
        if (!copied) {
          const input = document.createElement("textarea");
          input.value = selected.text;
          input.style.position = "fixed"; input.style.opacity = "0";
          document.body.appendChild(input);
          try { input.select(); copied = document.execCommand("copy"); } finally { input.remove(); }
        }
        onStatus(copied ? "已複製完整顧問內容。" : "無法自動複製，請在下方全文中選取並複製內容。");
      } catch { if (selectedVersion === version) onStatus("無法自動複製，請在下方全文中選取並複製內容。"); }
      finally { if (selectedVersion === version) el("copy").disabled = false; }
    });
    el("image").addEventListener("error", () => { if (current) onStatus("此瀏覽器無法預覽命盤圖，仍可按「儲存檔案」或使用系統分享取得 PNG。"); });
    window.addEventListener("pagehide", event => { if (!event.persisted) reset(); });
    reset();
    return { show, reset };
  }
  const api = Object.freeze({ mount, sizeLabel });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BaziFileDelivery = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
