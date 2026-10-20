const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const chart = require("../chart-export.js");
const path = require("node:path");
const fontRegistered = ["NotoSansTC-Regular.otf","NotoSansTC-Bold.otf"].map(file => {
  try { return Boolean(GlobalFonts.registerFromPath(path.join(__dirname,"fonts",file),"Louisko Bazi TC")); }
  catch { return false; }
}).every(Boolean);
const pngEncodingAvailable = (()=>{
  try {
    const probe=createCanvas(16,16);probe.getContext("2d").fillRect(0,0,16,16);
    return probe.toBuffer("image/png").subarray(0,8).toString("hex")==="89504e470d0a1a0a";
  } catch { return false; }
})();

// One render at a time bounds native canvas memory on the shared Node service.
let rendering = false;
function getRendererStatus() {
  return { available: pngEncodingAvailable, chineseFontAvailable: fontRegistered && GlobalFonts.has("Louisko Bazi TC") };
}
async function renderPng(payload) {
  if (rendering) {
    const error = new Error("命盤圖正在產生中，請稍後重試此下載連結。");
    error.statusCode = 503;
    throw error;
  }
  rendering = true;
  try {
    if (!getRendererStatus().chineseFontAvailable || !pngEncodingAvailable) {
      const error=new Error("命盤圖中文字型尚未就緒，請稍後再試。");error.statusCode=503;throw error;
    }
    const canvas = await chart.createCanvas(payload, {createCanvas:()=>createCanvas(1,1),fontFamily:'"Louisko Bazi TC", sans-serif'});
    return await canvas.encode("png");
  } finally { rendering = false; }
}
module.exports = {renderPng,getRendererStatus};
