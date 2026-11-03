# Unit economics calculator

**Try it: [avgchenchen.github.io/unit-economics-calculator](https://avgchenchen.github.io/unit-economics-calculator/)**

A calculator for subscription businesses. Enter your price, gross margin, churn and what it costs
to win a customer, and it tells you:

- **what one customer is worth** over their lifetime (LTV),
- **how that compares with what they cost to win** (LTV : CAC, against the common 3 : 1 rule of thumb),
- **how many months until they've paid that cost back**, allowing for customers who cancel,
- **what would have to change to reach 3 : 1**: the highest CAC, the highest churn or the lowest
  price that gets there,
- **how sensitive the answer is** to price and churn, in a colour-coded table.

It runs entirely in the browser. Nothing you type is sent anywhere, and the numbers are saved in
the page address so a scenario can be shared as a link.

## Run it

No install needed. Serve the folder and open it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # runs the calculation tests (Node 20 or newer)
```

## How it's built

```
index.html          the page
src/economics.js    every calculation, with no browser code
src/app.js          reads the form, calls economics.js, draws the results and the chart
src/styles.css      layout, light and dark themes
tests/              tests for economics.js, using Node's built-in test runner
docs/WALKTHROUGH.md plain-language explanation of every formula and design choice
```

- **The maths is separate from the page.** `economics.js` doesn't touch the browser, so the
  same functions run in the page and in the tests.
- **The tests use examples worked out by hand.** For example: $50 a month at 80% margin with 5%
  monthly churn and a $400 CAC gives an LTV of $800 and pays back in month 14, not month 10,
  because some customers cancel first.
- **No libraries.** The chart is drawn as SVG by hand, so the page loads instantly and has
  nothing to keep up to date.

## The model

| Measure | Formula |
|---|---|
| Monthly gross profit | price × gross margin |
| Lifetime value | monthly gross profit ÷ (monthly churn + monthly discount rate) |
| Average customer life | 1 ÷ monthly churn |
| Payback | first month where cumulative expected profit ≥ CAC |
| Price for 3 : 1 | 3 × CAC × (churn + discount rate) ÷ gross margin |

Assumptions: churn is the same every month, every customer pays the same price, and a new
customer always pays for their first month. Real businesses often lose more customers early on,
which this simple model doesn't capture.

## Limitations

- **3 : 1 is a rule of thumb, not a law.** It's widely quoted for subscription businesses, but a
  company can be healthy below it or struggling above it.
- **One average customer.** It doesn't model different customer groups, price tiers or upgrades.
- **An educational tool, not financial advice.**

## How this was built

AI-assisted: the code, tests and write-up were produced with Claude Code, then reviewed. The
commits say so with a `Co-Authored-By` line.

## Licence

MIT
