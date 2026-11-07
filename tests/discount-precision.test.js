import assert from "node:assert/strict";
import { test } from "node:test";

import { monthlyRate, lifetimeValue } from "../src/economics.js";
test("tiny positive annual rates remain positive", () => {
  const annual = 1e-15;
  const monthly = monthlyRate(annual);
  assert.ok(monthly > 0);
  assert.ok(Math.abs(monthly / (annual / 12) - 1) < 1e-12);
  assert.equal(monthlyRate(0), 0);
});
test("discounted LTV reflects a small but nonzero cost of money", () => {
  const base = {price: 50, grossMargin: 0.8, monthlyChurn: 1e-15};
  assert.ok(lifetimeValue({...base, annualDiscount: 1e-15}) < lifetimeValue(base));
  assert.ok(Math.abs(monthlyRate(1.01 ** 12 - 1) - 0.01) < 1e-14);
});
