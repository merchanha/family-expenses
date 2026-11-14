# Business Rules — Tandem Finance

**Version:** 1.1  
**Scope:** MVP  
**Product:** Tandem Finance  
**Users:** Two household members (a couple)  
**Aligned with:** `docs/PRODUCT_OVERVIEW.md`, `docs/design/tandem_finance/DESIGN.md`

## 1. General Rules

1. The application represents one shared household (**Shared Space**).
2. Both users have equal permissions.
3. Both users can view, create, edit, and delete financial transactions.
4. All financial information belongs to the household, not to an individual user.
5. Each transaction must record who created it.
6. Each transaction should record who actually paid for it when known (`paid_by`).
7. Both users share the same dashboard, categories & budgets (joint envelopes), financial progress, and savings goals.
8. Partner attribution must be visible where relevant (Partner 1 / Partner 2 / Shared chips).
9. The household may define a default contribution split (e.g. 50/50) for display and for envelope/goal preferences.
10. Global partner filters (**All Shared | Partner 1 | Partner 2**) restrict lists and aggregates to the selected scope without changing stored data.
11. The application should prioritize simplicity over complex financial features.
12. Brand and UI terminology should follow Tandem Finance (see Product Overview and design system).

## 2. Income and Expense Rules

1. Every transaction must have a type: `INCOME` or `EXPENSE`.
2. Every transaction must have a description, amount, date, and category.
3. Transaction amounts must always be greater than zero.
4. The transaction type determines whether the amount increases or decreases the household balance.
5. Income increases the household balance.
6. Expenses decrease the household balance.
7. Every transaction must belong to the household.
8. Users can edit or delete transactions.
9. Deleting a transaction must automatically update all financial calculations.
10. Transactions should use ARS (Argentine pesos) as the default and initial currency. Design mockups may show USD for presentation only.
11. Payment method and notes are optional.
12. Receipt attachments are optional and may be phased after core CRUD.

### Transaction ownership

There is an important distinction between:

- **Created by:** The person who registered the transaction.
- **Paid by:** The person who actually paid for the expense (**Who paid for this?** in the Add Transaction modal).

For example, if one partner buys groceries using their own card, the transaction can be registered by either partner while identifying who paid.

This information is useful for transparency and partner filters. It does **not** by itself change the shared household balance.

### Partner attribution vs expense splitting (MVP)

**In scope for MVP:**

- Record `created_by` and `paid_by`.
- Show partner attribution chips on transactions and related surfaces.
- Household default split indicator (e.g. 50/50) in chrome / Settings & Household.
- Optional contribution-split preference on budgets/envelopes and savings goals.

**Out of scope for MVP:**

- Per-transaction custom percentage splits that create settlement balances.
- Automatic “Partner A owes Partner B” ledgers and settlement workflows.
- Partner approval queues for large purchases.

## 3. Categories & Budgets (Joint Envelopes)

Categories and monthly budgets are one product area: **Categories & Budgets**. In the UI, a category with an optional monthly threshold may be called a **Joint Envelope**.

### Category rules

1. The application should provide default categories.
2. Users can create as many custom categories / envelopes as they want.
3. Each category must have a name and transaction type.
4. Categories can be edited.
5. Categories should support an optional icon and color.
6. Income and expense categories should be distinguishable.
7. A transaction must use a category compatible with its type.
8. Categories already used by transactions should not be permanently deleted. They can be deactivated instead.
9. Historical transactions must preserve their original category association.

### Default Expense Categories

Aligned with Product Overview grouping (names may be combined in UI as envelopes such as “Groceries & Food” or “Rent & Housing”):

- Rent / Housing
- Food / Groceries
- Utilities / Services
- Transportation
- Recreation / Entertainment
- Healthcare
- Shopping
- Subscriptions
- Travel
- Education / Personal
- Savings / Investments / Debt payments (financial)
- Other

### Default Income Categories

- Salary
- Freelance
- Additional Income
- Other

### Monthly budget rules

1. Users can define a monthly budget (threshold) for each expense category / envelope.
2. Budgets are optional.
3. Each category can have one budget per month.
4. The amount spent in a category is calculated from its expense transactions.
5. Budget utilization is calculated automatically.

`Budget Utilization = (Category Expenses / Budget Amount) * 100`

6. Budgets may store an optional contribution-split preference (display / planning only in MVP).
7. Budgets must never modify transaction amounts.
8. Changes to a budget should not modify historical transactions.
9. Users can edit budgets at any time.

### Budget status

- **Within budget (green):** utilization below 80%.
- **Approaching limit (amber):** utilization from 80% up to (but not including) 100%.
- **Budget exceeded (rose):** utilization at 100% or higher.

## 4. Monthly Financial Calculations

The application should calculate all financial information automatically for the selected period (default: current calendar month).

Design label **Net Cash Flow Buffer** maps to remaining balance before savings allocations.

### Total Income

Sum of all income transactions within the selected period.

### Total Expenses

Sum of all expense transactions within the selected period.

### Net Cash Flow Buffer (Remaining Balance Before Savings)

`Total Income - Total Expenses`

This is the primary dashboard remaining-balance metric. It represents money remaining before allocating contributions toward savings goals.

### Available Balance (After Savings Allocations)

`Total Income - Total Expenses - Savings Contributions`

This represents money remaining after expenses and savings allocations for the period.

### Savings Rate

`(Total Income - Total Expenses) / Total Income * 100`

If income is zero, the savings rate should be displayed as unavailable.

### Partner-filtered totals

When the partner filter is not **All Shared**, income/expense aggregates and lists include only transactions attributed to that partner (`paid_by` / agreed attribution field). Savings rate and budget utilization under a partner filter must use the same filtered transaction set and must not invent data.

### Important

Savings contributions must not be counted as ordinary expenses. Otherwise, the application would incorrectly report that the household spent more money than it actually consumed.

## 5. Savings Rules

Savings should be treated as an allocation of money, not as an ordinary expense.

1. Users can create shared savings goals.
2. Each goal must have a name and target amount.
3. Users can register contributions toward a goal.
4. Both partners can contribute to the same goal.
5. Every contribution must have an amount, date, and contributing user.
6. Goals may store an optional monthly contribution-split preference between partners (planning metadata in MVP).
7. Contributions increase the goal's saved amount.
8. Contributions reduce the household's **Available Balance (After Savings Allocations)**.
9. Contributions must not appear in ordinary expense categories.
10. The goal progress is calculated automatically.

`Goal Progress = (Current Saved Amount / Target Amount) * 100`

11. A goal is considered completed when its saved amount reaches or exceeds its target.
12. Users can edit or delete contributions, and the goal balance must be recalculated.
13. Autopilot, round-ups, APY vaults, and automated sweeps shown in design mockups are **out of scope for MVP**.

## 6. Monthly Comparison Rules (Financial Progress)

1. Users can compare the current month with previous months on **Financial Progress**.
2. Comparisons should include total income, expenses, and savings.
3. Category comparisons should show which expenses increased or decreased.
4. Percentage variations should be calculated only when the comparison baseline is greater than zero.
5. Comparisons should use equivalent periods.

For example, if the current month has only 10 days of recorded activity, compare those 10 days with the first 10 days of the previous month rather than comparing against the entire previous month.

### Spending Variation

`((Current Expenses - Previous Expenses) / Previous Expenses) * 100`

6. An increase in expenses does not automatically mean the household exceeded its budget.
7. The application should distinguish between spending increases and budget violations.
8. Design-only metrics (friction score, equity index, couple badges, predictive runway) are **out of scope for MVP** unless explicitly promoted later.

## 7. Notifications and Alerts

The application should generate simple notifications based on financial activity (**Notifications** / Alerts Center).

### Budget Alerts

- Notify when a category reaches **80%** of its budget.
- Notify when a category reaches **90%** of its budget.
- Notify when a category reaches or exceeds **100%** of its budget.

### Monthly Comparison Alerts

- Notify when a category's spending increases significantly compared to the previous month.
- Notify when total household expenses increase compared to the previous month.

### Positive / Milestone Alerts

- Notify when a savings goal reaches an important milestone or is completed.
- Notify when household savings or spending improves meaningfully vs the prior period (optional, non-spammy).

### Partner Activity Alerts (MVP-light)

- Partners may see notifications about notable household activity.
- Settlement-debt and approval-queue alerts remain out of scope for MVP.

### General Rules

1. Both partners can see household notifications.
2. Notifications can be marked as read (including mark-all-as-read).
3. Notifications should not be duplicated repeatedly for the same event.
4. Notifications are informational and should not automatically modify budgets or transactions.
5. Notification filters in the UI may group by type (All, Partner Activity, Budgets & Splits, Goals & Milestones, etc.) without changing these rules.

## 8. AI Recommendations (AI Insights / Tandem Co-pilot)

AI is an assistant, not a financial administrator. In the product it appears as **AI Insights** and **Tandem Co-pilot**.

1. AI can analyze household income and expenses.
2. AI can identify spending patterns.
3. AI can suggest opportunities to save money.
4. AI can summarize monthly financial activity.
5. AI can answer questions about recorded financial data.
6. AI can surface short dashboard nudges based on real data.
7. AI recommendations must be based on actual available data.
8. AI cannot invent financial figures.
9. AI cannot create, edit, or delete transactions.
10. AI cannot modify budgets or savings goals without explicit user action.
11. What-If engines and Autopilot money movement shown in mockups are **out of scope for MVP**.

## 9. Data and Security Rules

1. Both users must authenticate before accessing the application.
2. Users can only access their household's financial information.
3. Both household members have equal permissions.
4. All transactions must be associated with a valid household.
5. All financial calculations must be performed using stored transaction data.
6. The backend must validate all financial operations.
7. Deleting or editing transactions must update related financial summaries.
8. Design trust claims (SOC2, FDIC, bank-grade) must not be treated as product requirements until true.

## 10. Date and Period Rules

1. The application uses calendar months for monthly reports.
2. The default dashboard period is the current month.
3. Users can navigate between previous months (and supported presets such as last month / custom range).
4. Transactions must preserve their actual transaction date.
5. All monthly calculations must use the transaction date, not the creation date.
6. The household's local timezone should be used for date-based reporting.

## 11. Out of Scope for the MVP

To avoid unnecessary complexity, the first version will not include:

- Bank account integrations / “accounts synced” behavior.
- Automatic bank transaction imports.
- Complex debt management.
- Credit card statement management.
- Automatic currency conversion.
- Individual financial accounts separate from the household ledger.
- Per-transaction percentage expense splitting and settlement ledgers.
- Partner approval workflows for purchases.
- Investment portfolio tracking.
- Automatic recurring payments.
- Savings autopilot, round-ups, sweeps, and APY / vault products.
- Passkeys, Face ID, and SSO (unless later promoted).
- Complex financial forecasting, friction/equity scores, and What-If Autopilot engines.

These features can be considered in future versions and may appear as aspirational UI in design mockups.

---

## Final Principle

The application should always answer three simple questions:

1. **How much money did we receive?**
2. **Where did our money go?**
3. **How much money do we have available to save or spend?**

Every feature and financial calculation should support answering these questions accurately and simply — with clear partner attribution in Tandem’s Shared Space.
