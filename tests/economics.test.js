import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyse,
  cacFromSpend,
  cumulativeProfit,
  expectedProfitInMonth,
  lifetimeValue,
  monthlyRate,
  paybackMonths,
  sensitivity,
  validate,
  verdict,
} from "../src/economics.js";

// $50 a month, 80% margin (so $40 gross profit a month), 5% of customers cancel each month,
// $400 to win a customer. Worked by hand: LTV = 40 / 0.05 = $800, LTV:CAC = 2.
const base = { price: 50, grossMargin: 0.8, monthlyChurn: 0.05, cac: 400, annualDiscount: 0 };

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test("lifetime value without discounting is monthly gross profit divided by churn", () => {
  close(lifetimeValue(base), 800);
});

test("lifetime value equals the sum of every month's expected profit", () => {
  const inputs = { ...base, annualDiscount: 0.1 };
  let total = 0;
  for (let t = 1; t <= 5000; t += 1) total += expectedProfitInMonth(t, inputs);
  close(lifetimeValue(inputs), total, 1e-6);
});

test("discounting lowers lifetime value", () => {
  assert.ok(lifetimeValue({ ...base, annualDiscount: 0.1 }) < lifetimeValue(base));
});

test("a 12.68% annual rate is 1% a month", () => {
  close(monthlyRate(1.01 ** 12 - 1), 0.01);
});

test("the first month is always paid, later months shrink with churn", () => {
  close(expectedProfitInMonth(1, base), 40);
  close(expectedProfitInMonth(2, base), 38);
  close(expectedProfitInMonth(3, base), 36.1);
});

test("payback allows for customers who cancel along the way", () => {
  // Without churn, $400 / $40 = 10 months. With churn, solve 40 x (1 - 0.95^n) / 0.05 >= 400:
  // 0.95^n <= 0.5, so n >= 13.51, i.e. month 14.
  assert.equal(paybackMonths(base), 14);
  close(analyse(base).simplePaybackMonths, 10);
});

test("payback is never when lifetime value is below the cost", () => {
  assert.equal(paybackMonths({ ...base, cac: 900 }), null);
});

test("payback is immediate when winning a customer costs nothing", () => {
  assert.equal(paybackMonths({ ...base, cac: 0 }), 0);
  assert.equal(analyse({ ...base, cac: 0 }).ratio, Infinity);
});

test("the cumulative curve starts at zero and approaches lifetime value", () => {
  const curve = cumulativeProfit(base, 600);
  assert.equal(curve[0], 0);
  close(curve[1], 40);
  close(curve.at(-1), 800, 1e-6);
});

test("analyse reports the ratio, verdict and the limits for a healthy 3:1", () => {
  const result = analyse(base);
  close(result.ratio, 2);
  assert.equal(result.verdict.level, "thin");
  close(result.expectedLifetimeMonths, 20);
  close(result.maxCacForHealthy, 800 / 3);
  // Churn for 3:1: 40 / c = 1,200, so c = 3.33% a month.
  close(result.maxChurnForHealthy, 40 / 1200);
  // Price for 3:1: p x 0.8 / 0.05 = 1,200, so p = $75.
  close(result.minPriceForHealthy, 75);
  close(lifetimeValue({ ...base, price: result.minPriceForHealthy }) / base.cac, 3);
  assert.equal(result.curve.length, 37);
});

test("verdict bands", () => {
  assert.equal(verdict(0.9).level, "loss");
  assert.equal(verdict(1).level, "thin");
  assert.equal(verdict(3).level, "healthy");
});

test("invalid inputs give messages instead of numbers", () => {
  assert.deepEqual(validate(base), []);
  const result = analyse({ ...base, monthlyChurn: 0, grossMargin: 1.5, price: Number.NaN });
  assert.equal(result.errors.length, 3);
  assert.equal(result.ltv, undefined);
});

test("cost to win a customer from total spend", () => {
  assert.equal(cacFromSpend(12000, 30), 400);
  assert.equal(cacFromSpend(12000, 0), null);
});

test("sensitivity grid: rows are churn, columns are price", () => {
  const grid = sensitivity(base, [40, 50], [0.05, 0.1]);
  close(grid[0][1], 2); // the base case
  close(grid[0][0], 1.6); // $32 / 0.05 = $640, / 400
  close(grid[1][1], 1); // $40 / 0.10 = $400, / 400
});

test("CAC inputs must be finite, non-negative spend and a positive whole customer count", () => {
  assert.equal(cacFromSpend(0, 5), 0);
  for (const spend of [-1, Number.NaN, Infinity, -Infinity]) {
    assert.equal(cacFromSpend(spend, 5), null);
  }
  for (const customers of [0, -1, 1.5, Number.NaN, Infinity]) {
    assert.equal(cacFromSpend(100, customers), null);
  }
});
