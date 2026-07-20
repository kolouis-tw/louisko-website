const PALACE_BLUEPRINT = [
  { key: "ming", label: "命宮", branch: "子" },
  { key: "siblings", label: "兄弟宮", branch: "丑" },
  { key: "marriage", label: "夫妻宮", branch: "寅" },
  { key: "children", label: "子女宮", branch: "卯" },
  { key: "wealth", label: "財帛宮", branch: "辰" },
  { key: "health", label: "疾厄宮", branch: "巳" },
  { key: "travel", label: "遷移宮", branch: "午" },
  { key: "friends", label: "交友宮", branch: "未" },
  { key: "career", label: "官祿宮", branch: "申" },
  { key: "property", label: "田宅宮", branch: "酉" },
  { key: "fortune", label: "福德宮", branch: "戌" },
  { key: "parents", label: "父母宮", branch: "亥" }
];

const form = document.querySelector("#ziwei-form");
const inputSummary = document.querySelector("#input-summary");
const palaceBoard = document.querySelector("#palace-board");

function normalizeInput(formData) {
  return {
    year: Number(formData.get("year")),
    month: Number(formData.get("month")),
    day: Number(formData.get("day")),
    hour: Number(formData.get("hour")),
    minute: Number(formData.get("minute")),
    gender: formData.get("gender"),
    calendar: formData.get("calendar"),
    timezoneOffset: new Date().getTimezoneOffset() * -1
  };
}

function createPlaceholderChart(input) {
  return {
    input,
    summary: {
      ming: "待補",
      shen: "待補",
      majorStars: "待補",
      transforms: "待補"
    },
    palaces: PALACE_BLUEPRINT.map((palace) => ({
      ...palace,
      majorStars: [],
      minorStars: [],
      transforms: [],
      notes: ["安星模組尚未接入"]
    }))
  };
}

function formatCalendar(calendar) {
  return calendar === "solar" ? "陽曆" : "農曆";
}

function renderSummary(chart) {
  const { input, summary } = chart;
  inputSummary.textContent =
    `${input.year} 年 ${input.month} 月 ${input.day} 日 ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}｜` +
    `${input.gender}｜${formatCalendar(input.calendar)}｜UTC${formatTimezone(input.timezoneOffset)}`;

  document.querySelector("#summary-ming").textContent = summary.ming;
  document.querySelector("#summary-shen").textContent = summary.shen;
  document.querySelector("#summary-stars").textContent = summary.majorStars;
  document.querySelector("#summary-transforms").textContent = summary.transforms;
}

function formatTimezone(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function renderPalaces(chart) {
  palaceBoard.innerHTML = chart.palaces
    .map(
      (palace) => `
        <article class="palace-card" data-palace="${palace.key}">
          <header>
            <h3>${palace.label}</h3>
            <span class="branch-badge">${palace.branch}</span>
          </header>
          <div class="palace-meta">
            <div class="meta-row">
              <span>主星</span>
              <strong>${palace.majorStars.length ? palace.majorStars.join("、") : "待補"}</strong>
            </div>
            <div class="meta-row">
              <span>輔星</span>
              <strong>${palace.minorStars.length ? palace.minorStars.join("、") : "待補"}</strong>
            </div>
            <div class="meta-row">
              <span>四化</span>
              <strong>${palace.transforms.length ? palace.transforms.join("、") : "待補"}</strong>
            </div>
          </div>
          <p class="placeholder-note">${palace.notes.join(" / ")}</p>
        </article>
      `
    )
    .join("");
}

function validateInput(input) {
  return (
    Number.isInteger(input.year) &&
    input.month >= 1 &&
    input.month <= 12 &&
    input.day >= 1 &&
    input.day <= 31 &&
    input.hour >= 0 &&
    input.hour <= 23 &&
    input.minute >= 0 &&
    input.minute <= 59
  );
}

function refreshChart() {
  const formData = new FormData(form);
  const input = normalizeInput(formData);

  if (!validateInput(input)) {
    inputSummary.textContent = "請先填入有效的出生資料。";
    return;
  }

  const chart = createPlaceholderChart(input);
  renderSummary(chart);
  renderPalaces(chart);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  refreshChart();
});

form.addEventListener("input", () => {
  refreshChart();
});

refreshChart();
