// Unit economics for a subscription business: what one customer is worth, what it costs to win
// one, and how long it takes to earn that cost back.
//
// Model: every customer pays `price` a month and keeps `grossMargin` of it as gross profit. Each
// month, a fixed share of customers (`monthlyChurn`) cancels. A customer always pays for their
// first month. Future profit can be discounted at an annual rate to reflect the cost of money.
//
// This file has no browser code, so the same functions run in the page and in the tests.

export const HEALTHY_RATIO = 3; // the common "LTV at least 3x CAC" rule of thumb
const MAX_MONTHS = 600; // 50 years: beyond this, payback is reported as "never"

/** Monthly rate equivalent to an annual discount rate: (1 + annual)^(1/12) - 1. */
export function monthlyRate(annual) {
  return (1 + annual) ** (1 / 12) - 1;
}

/** Cost to win one customer, from total sales and marketing spend and the customers it won. */
export function cacFromSpend(spend, newCustomers) {
  if (!(newCustomers > 0)) return null;
  return spend / newCustomers;
}

/** Check the inputs. Returns a list of messages; an empty list means the inputs are usable. */
export function validate({ price, grossMargin, monthlyChurn, cac, annualDiscount = 0 }) {
  const errors = [];
  const isNumber = (x) => typeof x === "number" && Number.isFinite(x);
  if (!isNumber(price) || price <= 0) errors.push("Price must be more than 0.");
  if (!isNumber(grossMargin) || grossMargin <= 0 || grossMargin > 1)
    errors.push("Gross margin must be more than 0% and at most 100%.");
  if (!isNumber(monthlyChurn) || monthlyChurn <= 0 || monthlyChurn > 1)
    errors.push("Monthly churn must be more than 0% and at most 100%.");
  if (!isNumber(cac) || cac < 0) errors.push("Cost to win a customer can't be negative.");
  if (!isNumber(annualDiscount) || annualDiscount < 0 || annualDiscount > 1)
    errors.push("Discount rate must be between 0% and 100%.");
  return errors;
}

/**
 * Expected gross profit from one customer in month t (t = 1 is the first month), today's money.
 * They're still a customer in month t with probability (1 - churn)^(t - 1).
 */
export function expectedProfitInMonth(t, { price, grossMargin, monthlyChurn, annualDiscount = 0 }) {
  const survival = (1 - monthlyChurn) ** (t - 1);
  return (price * grossMargin * survival) / (1 + monthlyRate(annualDiscount)) ** t;
}

/**
 * Lifetime value: the expected gross profit from one customer over their whole life.
 *
 * Summing expectedProfitInMonth over t = 1, 2, 3, ... gives a geometric series with the exact
 * total m / (c + d), where m is monthly gross profit, c is churn and d is the monthly discount
 * rate. With no discounting it's m / c: monthly profit times the expected lifetime of 1 / c months.
 */
export function lifetimeValue({ price, grossMargin, monthlyChurn, annualDiscount = 0 }) {
  return (price * grossMargin) / (monthlyChurn + monthlyRate(annualDiscount));
}

/**
 * Months until the expected profit from one customer covers what it cost to win them, allowing
 * for customers who cancel along the way. Returns null if it never does.
 */
export function paybackMonths(inputs) {
  if (inputs.cac === 0) return 0;
  let total = 0;
  for (let t = 1; t <= MAX_MONTHS; t += 1) {
    total += expectedProfitInMonth(t, inputs);
    if (total >= inputs.cac - 1e-9) return t;
  }
  return null;
}

/** Cumulative expected profit per customer after 0, 1, ..., months months. */
export function cumulativeProfit(inputs, months) {
  const points = [0];
  for (let t = 1; t <= months; t += 1) points.push(points[t - 1] + expectedProfitInMonth(t, inputs));
  return points;
}

/** Plain-language verdict for an LTV:CAC ratio. */
export function verdict(ratio) {
  if (ratio < 1) return { level: "loss", text: "Each customer costs more to win than they ever earn back." };
  if (ratio < HEALTHY_RATIO)
    return { level: "thin", text: "Customers pay back their cost, but with little left for everything else." };
  return { level: "healthy", text: `At or above the common ${HEALTHY_RATIO}:1 rule of thumb.` };
}

/** Everything the page shows, in one object. */
export function analyse(inputs, chartMonths = 36) {
  const errors = validate(inputs);
  if (errors.length) return { errors };
  const monthlyProfit = inputs.price * inputs.grossMargin;
  const ltv = lifetimeValue(inputs);
  const ratio = inputs.cac > 0 ? ltv / inputs.cac : Infinity;
  const d = monthlyRate(inputs.annualDiscount ?? 0);
  return {
    errors: [],
    monthlyProfit,
    expectedLifetimeMonths: 1 / inputs.monthlyChurn,
    ltv,
    ratio,
    verdict: verdict(ratio),
    paybackMonths: paybackMonths(inputs),
    simplePaybackMonths: inputs.cac / monthlyProfit, // ignores churn and discounting
    maxCacForHealthy: ltv / HEALTHY_RATIO,
    // The churn at which LTV is exactly HEALTHY_RATIO x CAC: solve m / (c + d) = 3 x CAC for c.
    maxChurnForHealthy: inputs.cac > 0 ? monthlyProfit / (HEALTHY_RATIO * inputs.cac) - d : null,
    // The price at which LTV is exactly HEALTHY_RATIO x CAC: solve p x gm / (c + d) = 3 x CAC for p.
    minPriceForHealthy: (HEALTHY_RATIO * inputs.cac * (inputs.monthlyChurn + d)) / inputs.grossMargin,
    curve: cumulativeProfit(inputs, chartMonths),
  };
}

/** LTV:CAC for each combination of price and churn, for the sensitivity table. */
export function sensitivity(inputs, prices, churns) {
  return churns.map((monthlyChurn) =>
    prices.map((price) => {
      const ltv = lifetimeValue({ ...inputs, price, monthlyChurn });
      return inputs.cac > 0 ? ltv / inputs.cac : Infinity;
    }),
  );
}
