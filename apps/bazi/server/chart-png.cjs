const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const chart = require("../chart-export.js");

// One render at a time bounds native canvas memory on the shared Node service.
let rendering = false;
function getRendererStatus() {
  return { available: true, chineseFontAvailable: ["Noto Sans CJK TC", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", "Arial Unicode MS"].some(name=>GlobalFonts.has(name)) };
}
async function renderPng(payload) {
  if (rendering) {
    const error = new Error("命盤圖正在產生中，請稍後重試此下載連結。");
    error.statusCode = 503;
    throw error;
  }
  rendering = true;
  try {
    if (!getRendererStatus().chineseFontAvailable) {
      const error=new Error("命盤圖中文字型尚未就緒，請稍後再試。");error.statusCode=503;throw error;
    }
    const canvas = await chart.createCanvas(payload, {createCanvas:()=>createCanvas(1,1)});
    return await canvas.encode("png");
  } finally { rendering = false; }
}
module.exports = {renderPng,getRendererStatus};
