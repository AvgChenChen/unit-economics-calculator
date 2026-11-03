// Connects the form to the calculations in economics.js and draws the results.

import { analyse, cacFromSpend, HEALTHY_RATIO, sensitivity } from "./economics.js";

// Made-up example numbers, not real companies.
const EXAMPLES = {
  software: { price: 50, grossMargin: 80, monthlyChurn: 3, cac: 600, annualDiscount: 0 },
  mealkit: { price: 60, grossMargin: 30, monthlyChurn: 12, cac: 90, annualDiscount: 0 },
  fitness: { price: 15, grossMargin: 85, monthlyChurn: 8, cac: 40, annualDiscount: 0 },
};
const FIELDS = ["price", "grossMargin", "monthlyChurn", "cac", "annualDiscount"];
const PERCENT = new Set(["grossMargin", "monthlyChurn", "annualDiscount"]);

const $ = (id) => document.getElementById(id);
// Whole dollars from $100 up; below that, cents unless the amount is a whole number ($50, $67.50).
const money = (x) => {
  if (!Number.isFinite(x)) return "∞";
  const cents = x < 100 && Math.round(x * 100) % 100 !== 0 ? 2 : 0;
  return `$${x.toLocaleString("en-CA", { minimumFractionDigits: cents, maximumFractionDigits: cents })}`;
};
const pct = (x, digits = 1) => `${(x * 100).toLocaleString("en-CA", { maximumFractionDigits: digits })}%`;

// A round step for chart gridlines: 1, 2 or 5 times a power of ten.
function niceStep(max, lines = 4) {
  const rough = max / lines;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= rough);
}
const months = (n) => `${n.toLocaleString("en-CA", { maximumFractionDigits: 1 })} month${n === 1 ? "" : "s"}`;
const ratioText = (r) => (Number.isFinite(r) ? `${r.toFixed(1)} : 1` : "∞");

function readInputs() {
  const values = {};
  for (const name of FIELDS) {
    const raw = $(name).value.trim();
    const n = raw === "" ? (name === "annualDiscount" ? 0 : Number.NaN) : Number(raw);
    values[name] = PERCENT.has(name) ? n / 100 : n;
  }
  return values;
}

function setInputs(values) {
  for (const name of FIELDS) $(name).value = values[name] ?? "";
}

function saveToUrl(values) {
  const params = new URLSearchParams();
  for (const name of FIELDS) params.set(name, $(name).value);
  history.replaceState(null, "", `?${params}`);
  return values;
}

function loadFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!FIELDS.some((f) => params.has(f))) return null;
  return Object.fromEntries(FIELDS.map((f) => [f, params.get(f) ?? ""]));
}

function drawChart(result, cac) {
  const width = 640;
  const height = 260;
  const pad = { left: 60, right: 16, top: 16, bottom: 32 };
  const curve = result.curve;
  const step = niceStep(Math.max(cac, result.ltv, curve.at(-1)) * 1.1 || 1);
  const maxY = step * Math.ceil((Math.max(cac, result.ltv, curve.at(-1)) * 1.1 || 1) / step);
  const x = (m) => pad.left + (m / (curve.length - 1)) * (width - pad.left - pad.right);
  const y = (v) => height - pad.bottom - (v / maxY) * (height - pad.top - pad.bottom);
  const path = curve.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const ticks = Array.from({ length: Math.round(maxY / step) + 1 }, (_, i) => i * step);
  const grid = ticks
    .map(
      (v) =>
        `<line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y(v)}" y2="${y(v)}"/>` +
        `<text x="${pad.left - 6}" y="${y(v) + 4}" text-anchor="end">${money(v)}</text>`,
    )
    .join("");
  const xTicks = [0, 6, 12, 18, 24, 30, 36]
    .filter((m) => m < curve.length)
    .map((m) => `<text x="${x(m)}" y="${height - 10}" text-anchor="middle">${m}</text>`)
    .join("");

  let payback = "";
  const p = result.paybackMonths;
  if (p !== null && p > 0 && p < curve.length) {
    payback =
      `<circle class="payback-dot" cx="${x(p)}" cy="${y(curve[p])}" r="5"/>` +
      `<text class="label-strong" x="${x(p) + 8}" y="${y(curve[p]) + 16}">Paid back in month ${p}</text>`;
  }

  $("chart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Cumulative expected profit per customer over ${curve.length - 1} months, against the cost to win them">
      ${grid}${xTicks}
      <text x="${width - pad.right}" y="${height - 10}" text-anchor="end">months</text>
      <line class="ltv-line" x1="${pad.left}" x2="${width - pad.right}" y1="${y(result.ltv)}" y2="${y(result.ltv)}"/>
      <text x="${width - pad.right}" y="${y(result.ltv) - 5}" text-anchor="end">Lifetime value ${money(result.ltv)}</text>
      <line class="cac-line" x1="${pad.left}" x2="${width - pad.right}" y1="${y(cac)}" y2="${y(cac)}"/>
      <text x="${width - pad.right}" y="${y(cac) - 5}" text-anchor="end">Cost to win ${money(cac)}</text>
      <path class="curve" d="${path}"/>
      ${payback}
    </svg>`;
}

function drawSensitivity(inputs) {
  const priceSteps = [-0.2, -0.1, 0, 0.1, 0.2];
  const churnSteps = [0.5, 0.75, 1, 1.25, 1.5];
  const prices = priceSteps.map((s) => inputs.price * (1 + s));
  const churns = churnSteps.map((s) => Math.min(inputs.monthlyChurn * s, 1));
  const grid = sensitivity(inputs, prices, churns);
  const level = (r) => (r < 1 ? "loss" : r < HEALTHY_RATIO ? "thin" : "healthy");
  const head = `<tr><th>Churn ↓ / Price →</th>${prices.map((p) => `<th>${money(p)}</th>`).join("")}</tr>`;
  const rows = grid
    .map(
      (row, i) =>
        `<tr><th>${pct(churns[i], 2)}</th>${row
          .map(
            (r, j) =>
              `<td class="${level(r)}${i === 2 && j === 2 ? " current" : ""}">${Number.isFinite(r) ? r.toFixed(1) : "∞"}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  $("sensitivity").innerHTML = head + rows;
}

function render() {
  const inputs = saveToUrl(readInputs());
  const result = analyse(inputs);
  for (const name of FIELDS) $(name).removeAttribute("aria-invalid");
  $("errors").innerHTML = result.errors.map((e) => `<li>${e}</li>`).join("");
  if (result.errors.length) {
    $("verdict").className = "verdict";
    $("ratio").textContent = "–";
    $("verdictText").textContent = "Fill in the numbers on the left to see results.";
    return;
  }

  $("verdict").className = `verdict ${result.verdict.level}`;
  $("ratio").textContent = ratioText(result.ratio);
  $("verdictText").textContent = result.verdict.text;

  $("ltv").textContent = money(result.ltv);
  $("ltvNote").textContent = `${money(result.monthlyProfit)} gross profit a month.`;
  $("cacOut").textContent = money(inputs.cac);
  $("payback").textContent = result.paybackMonths === null ? "Never" : months(result.paybackMonths);
  $("paybackNote").textContent =
    result.paybackMonths === null
      ? "Lifetime value is below the cost to win."
      : `${months(Math.round(result.simplePaybackMonths * 10) / 10)} if nobody cancelled.`;
  $("lifetime").textContent = months(Math.round(result.expectedLifetimeMonths * 10) / 10);

  const levers = [];
  if (result.ratio >= HEALTHY_RATIO) {
    levers.push(`You're already there. CAC could rise to ${money(result.maxCacForHealthy)} and stay at 3 : 1.`);
  } else {
    levers.push(`<strong>CAC</strong> of ${money(result.maxCacForHealthy)} or less (now ${money(inputs.cac)}), or`);
    if (result.maxChurnForHealthy > 0) {
      levers.push(`<strong>monthly churn</strong> of ${pct(result.maxChurnForHealthy)} or less (now ${pct(inputs.monthlyChurn)}), or`);
    } else {
      levers.push(`<strong>churn</strong> alone can't get there at this price and discount rate, so`);
    }
    levers.push(`a <strong>price</strong> of ${money(result.minPriceForHealthy)} or more (now ${money(inputs.price)}).`);
  }
  $("levers").innerHTML = levers.map((l) => `<li>${l}</li>`).join("");

  drawChart(result, inputs.cac);
  drawSensitivity(inputs);
}

function start() {
  setInputs(loadFromUrl() ?? EXAMPLES.software);
  $("inputs").addEventListener("input", render);
  for (const button of document.querySelectorAll("[data-example]")) {
    button.addEventListener("click", () => {
      setInputs(EXAMPLES[button.dataset.example]);
      render();
    });
  }
  $("useSpend").addEventListener("click", () => {
    const cac = cacFromSpend(Number($("spend").value), Number($("newCustomers").value));
    if (cac === null) {
      $("spendResult").textContent = "Enter a number of new customers above 0.";
      return;
    }
    $("cac").value = Math.round(cac * 100) / 100;
    $("spendResult").textContent = `CAC set to ${money(cac)}.`;
    render();
  });
  render();
}

start();
