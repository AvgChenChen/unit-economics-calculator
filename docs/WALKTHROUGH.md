# Walkthrough: the ideas behind the calculator, in plain language

Read this before you talk about the project. Unit economics comes up in startup, consulting and
VC interviews, so this doubles as revision.

## The question every subscription business asks

"If I spend money to win a customer, do I get more than that back?" Three numbers answer it:

- **CAC (customer acquisition cost):** sales and marketing spend divided by new customers won.
  Spend $12,000 and win 30 customers, and CAC is $400.
- **LTV (lifetime value):** the gross profit a customer brings in before they cancel.
- **Payback:** how many months it takes to earn the CAC back.

## Lifetime value, step by step

Take the worked example from the tests: $50 a month, 80% gross margin, 5% of customers cancel
each month, $400 CAC.

1. **Monthly gross profit** = $50 × 80% = **$40**. Use gross profit, not revenue: revenue that
   goes straight out again on serving the customer isn't value.
2. **Average customer life** = 1 ÷ 5% = **20 months**. If 1 in 20 customers leave each month, the
   average customer stays 20 months.
3. **LTV** = $40 × 20 = **$800**, which is the same as $40 ÷ 5%.
4. **LTV : CAC** = $800 ÷ $400 = **2 : 1**. Below the 3 : 1 rule of thumb.

The code doesn't just assert the shortcut. It adds up every month's expected profit: month 1 is
$40 (everyone pays the first month), month 2 is $40 × 95% = $38 (5% have left), month 3 is
$36.10, and so on. That sum works out to exactly $40 ÷ 5%, and a test checks the two agree.

## Why payback is 14 months, not 10

The quick version is CAC ÷ monthly profit = $400 ÷ $40 = 10 months. But that assumes nobody
cancels. Because each month's expected profit shrinks, it takes until **month 14** for the
running total to reach $400. The calculator shows both numbers. The gap between them is a good
point to raise in an interview, because the quick formula is the one most people use.

## What would get you to 3 : 1?

The calculator solves the LTV formula backwards for each lever on its own:

- **Lower CAC:** the most you could spend is LTV ÷ 3 = $800 ÷ 3 = **$267**.
- **Lower churn:** $40 ÷ churn = 3 × $400 gives churn of **3.33%** a month.
- **Higher price:** price × 80% ÷ 5% = $1,200 gives a price of **$75**.

This is the most useful output for a business: it turns "the ratio is 2" into "you need to cut
churn from 5% to 3.3%, or raise prices by half."

## The discount rate (the advanced setting)

A dollar in three years is worth less than a dollar today. With a discount rate, each future
month's profit is shrunk a little more. Mathematically it acts like extra churn: LTV becomes
monthly profit ÷ (churn + monthly discount rate). At 0% it's ignored, which is the usual
simplification.

## The sensitivity table

Rows change churn (half to one and a half times yours) and columns change price (20% lower to
20% higher). Each cell is the LTV : CAC you'd get. It shows at a glance which lever matters more.
For most subscription businesses, small changes in churn move the ratio more than small changes
in price.

## Design choices worth mentioning

- **The calculations are separate from the page**, so they can be tested without a browser.
- **The tests use numbers worked by hand**, so they check the maths, not just that code runs.
- **No outside libraries**, so it loads instantly and nothing breaks when a library updates.
- **The page address holds the inputs**, so a scenario can be shared by copying the link.

## Limitations, and what you'd say about them

- **Churn is the same every month.** In reality more customers leave in the first few months. A
  next step would be churn that falls with tenure, based on real cohort data.
- **One average customer.** Real businesses have tiers, discounts and upgrades (expansion
  revenue), which can push LTV well above this simple version.
- **3 : 1 is a rule of thumb.** A business growing fast might accept a lower ratio on purpose.

## Questions you might be asked

- **"Why gross profit and not revenue?"** Because LTV should measure what the customer leaves you
  to cover CAC and overheads, after the cost of serving them.
- **"Which matters more, LTV : CAC or payback?"** Both. A 5 : 1 ratio with a 40-month payback still
  ties up cash for years, which matters a lot for a startup with limited money.
- **"How would you get these inputs at a real company?"** Price and margin from the accounts,
  churn from cancellations divided by customers at the start of each month, and CAC from sales
  and marketing spend divided by new customers in the same period.
