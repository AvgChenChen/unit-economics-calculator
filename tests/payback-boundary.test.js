import assert from "node:assert/strict";
import { test } from "node:test";

import { lifetimeValue, paybackMonths } from "../src/economics.js";
const inputs = {price: 50, grossMargin: 0.8, monthlyChurn: 0.05, annualDiscount: 0};
test("an asymptotic LTV is not finite payback", () => {
  assert.equal(paybackMonths({...inputs, cac: lifetimeValue(inputs)}), null);
  assert.equal(paybackMonths({...inputs, cac: 400}), 14);
});
test("a fixed absolute tolerance cannot invent tiny-currency payback", () => {
  assert.equal(paybackMonths({...inputs, price: 1e-12, cac: 1e-10}), null);
  assert.equal(paybackMonths({...inputs, monthlyChurn: 1, cac: 40}), 1);
  assert.equal(paybackMonths({...inputs, cac: 0}), 0);
});
