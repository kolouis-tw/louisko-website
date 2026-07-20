const crypto = require("crypto");

const DEFAULT_LINE_TEXT_SAFE_LIMIT = 4500;
const DEFAULT_SESSION_TTL_MS = 15 * 60 * 1000;

function toUtf16Length(value) {
  return String(value ?? "").length;
}

function safeCompareHex(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !channelSecret) return false;
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return safeCompareHex(expected, String(signature));
}

function eventFingerprint(event, destination = "") {
  const source = event?.webhookEventId || JSON.stringify({
    destination,
    type: event?.type,
    timestamp: event?.timestamp,
    source: event?.source,
    message: event?.message,
    postback: event?.postback,
  });
  return crypto.createHash("sha256").update(String(source), "utf8").digest("hex");
}

function normalizeLineUserIds(value) {
  return new Set(String(value || "").split(/[\s,]+/).map((item) => item.trim()).filter(Boolean));
}

function isAllowedLineUser(userId, allowedUserIds) {
  return Boolean(userId && allowedUserIds instanceof Set && allowedUserIds.has(userId));
}

function parseQuickBaziInput(text, defaults = {}) {
  const normalized = String(text || "").trim().replace(/[：]/g, ":");
  if (!/^排盤(?:\s|$)/i.test(normalized)) return null;

  const body = normalized.replace(/^排盤\s*/i, "").trim();
  const dateMatch = body.match(/(\d{1,4})\s*[\/-年]\s*(\d{1,2})\s*[\/-月]\s*(\d{1,2})\s*日?/);
  const timeMatch = body.match(/(\d{1,2})\s*[:：時]\s*(\d{1,2})\s*分?/);
  const genderMatch = body.match(/(?:^|\s)(男|女)(?:\s|$)/);
  const name = body
    .replace(dateMatch?.[0] || "", " ")
    .replace(timeMatch?.[0] || "", " ")
    .replace(genderMatch?.[0] || "", " ")
    .replace(/\s+/g, " ")
    .trim();
  const missing = [];
  if (!name) missing.push("姓名");
  if (!dateMatch) missing.push("出生日期（例如 2000/01/01）");
  if (!timeMatch) missing.push("出生時間（例如 12:00）");
  if (!genderMatch) missing.push("性別（男或女）");
  if (missing.length) return { command: "quick-chart", status: "needs-fields", missing, partial: { name, dateMatch, timeMatch, genderMatch } };

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const daysInMonth = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > daysInMonth) {
    return { command: "quick-chart", status: "invalid", code: "INVALID_DATE", message: "出生日期格式或日期範圍不正確。" };
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { command: "quick-chart", status: "invalid", code: "INVALID_TIME", message: "出生時間格式或時間範圍不正確。" };
  }
  const gender = genderMatch[1] === "女" ? "female" : "male";
  return {
    command: "quick-chart",
    status: "ready",
    profile: {
      name,
      inputCalendarType: "solar",
      birthSolar: { year, month, day, hour, minute },
      birthLunar: { year, month, day, isLeap: false, ganzhiYear: "" },
      gender,
      hemisphere: defaults.hemisphere || "north",
      dayChangeRule: defaults.dayChangeRule || "lateZiHour",
      timezone: defaults.timezone || "Asia/Taipei",
      timezoneOffset: Number(defaults.timezoneOffset ?? 8),
    },
  };
}

function parseLineCommand(text) {
  const normalized = String(text || "").trim();
  if (/^(幫助|help|開始|menu)$/i.test(normalized)) return { command: "help" };
  if (/^(取消|cancel|返回)$/i.test(normalized)) return { command: "cancel" };
  if (/^(我的命主|命主列表|profiles?)$/i.test(normalized)) return { command: "profiles" };
  if (/^(查看\s*prompt|查看全文|prompt)$/i.test(normalized)) return { command: "view-prompt" };
  if (/^(取得\s*markdown|取得\s*md|下載\s*markdown)$/i.test(normalized)) return { command: "download-markdown" };
  return parseQuickBaziInput(normalized);
}

function splitAtBoundary(text, limit) {
  const candidate = String(text).slice(0, limit);
  const boundary = Math.max(
    candidate.lastIndexOf("\n\n"),
    candidate.lastIndexOf("\n"),
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("！"),
    candidate.lastIndexOf("？"),
    candidate.lastIndexOf("；")
  );
  return boundary >= Math.floor(limit * 0.55) ? boundary + (candidate[boundary] === "\n" ? 0 : 1) : limit;
}

function chunkPrompt(text, limit = DEFAULT_LINE_TEXT_SAFE_LIMIT) {
  const source = String(text ?? "");
  if (!source) return [];
  // Reserve room for the per-message title so the complete LINE text stays under the configured limit.
  const payloadLimit = Math.max(1, Number(limit) - 64);
  const chunks = [];
  let rest = source;
  while (rest.length > payloadLimit) {
    const splitIndex = splitAtBoundary(rest, payloadLimit);
    chunks.push(rest.slice(0, splitIndex).trimEnd());
    rest = rest.slice(splitIndex).trimStart();
  }
  if (rest) chunks.push(rest);

  const total = chunks.length;
  return chunks.map((chunk, index) => `【終身 AI 命理顧問 Prompt ${index + 1}/${total}】\n${chunk}`);
}

function buildTextMessage(text, quickReply) {
  const message = { type: "text", text: String(text) };
  if (quickReply) message.quickReply = { items: quickReply };
  return message;
}

function postbackItem(label, data, displayText = label) {
  return {
    type: "action",
    action: { type: "postback", label, data, displayText },
  };
}

function messageActionItem(label, text) {
  return {
    type: "action",
    action: { type: "message", label, text },
  };
}

function parsePostbackData(data) {
  const params = new URLSearchParams(String(data || ""));
  return { action: params.get("action") || "", profileId: params.get("profileId") || "", sessionId: params.get("sessionId") || "" };
}

function formatProfileSummary(profile) {
  const solar = profile?.birthSolar || {};
  const date = [solar.year, solar.month, solar.day].every(Number.isFinite)
    ? `${solar.year}/${String(solar.month).padStart(2, "0")}/${String(solar.day).padStart(2, "0")}`
    : "出生日期未完整";
  const time = [solar.hour, solar.minute].every(Number.isFinite)
    ? `${String(solar.hour).padStart(2, "0")}:${String(solar.minute).padStart(2, "0")}`
    : "時間未完整";
  return `${profile.name || "未命名"}｜${date} ${time}｜${profile.gender === "female" ? "女" : "男"}`;
}

function sanitizeFilename(value, fallback = "bazi-profile") {
  const safe = String(value || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 80);
  return safe || fallback;
}

function buildConfirmationMessage(sessionId, profile) {
  return buildTextMessage([
    "請確認排盤資料",
    "",
    `姓名：${profile.name}`,
    `出生日期：${profile.birthSolar.year}/${profile.birthSolar.month}/${profile.birthSolar.day}`,
    `出生時間：${String(profile.birthSolar.hour).padStart(2, "0")}:${String(profile.birthSolar.minute).padStart(2, "0")}`,
    `性別：${profile.gender === "female" ? "女" : "男"}`,
    "曆法：國曆",
    "",
    `時區：${profile.timezone}`,
    `半球：${profile.hemisphere === "south" ? "南半球" : "北半球"}`,
    `換日法：${profile.dayChangeRule === "midnight" ? "子正換日" : "子初換日"}`,
  ].join("\n"), [
    postbackItem("確認排盤", `action=confirm&sessionId=${encodeURIComponent(sessionId)}`, "確認排盤"),
    messageActionItem("取消", "取消"),
  ]);
}

function buildHelpMessage() {
  return buildTextMessage([
    "Louisko 八字命理顧問",
    "",
    "排盤 姓名 YYYY/MM/DD HH:MM 男／女",
    "例如：排盤 王小明 2000/01/01 12:00 男",
    "",
    "我的命主：查看既有命主",
    "查看 Prompt：查看目前有效 Prompt",
    "取得 Markdown：取得短效下載連結",
    "取消：取消目前操作",
  ].join("\n"));
}

module.exports = {
  DEFAULT_LINE_TEXT_SAFE_LIMIT,
  DEFAULT_SESSION_TTL_MS,
  buildConfirmationMessage,
  buildHelpMessage,
  buildTextMessage,
  chunkPrompt,
  eventFingerprint,
  formatProfileSummary,
  isAllowedLineUser,
  messageActionItem,
  normalizeLineUserIds,
  parseLineCommand,
  parsePostbackData,
  postbackItem,
  sanitizeFilename,
  toUtf16Length,
  verifyLineSignature,
};
