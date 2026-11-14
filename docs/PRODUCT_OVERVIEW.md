# Tandem Finance — Product Overview

**Document type:** Product Requirements Document (PRD)  
**Product status:** Initial concept  
**Version:** 1.2  
**Target platform:** Responsive Web Application  
**Primary users:** Two people sharing household finances  
**Product name:** Tandem Finance  
**Design system:** `docs/design/tandem_finance/DESIGN.md`  
**UI mockups:** `docs/design/*/`  
**Business rules:** `docs/BUSINESS_RULES.md`

---

# 1. Product Vision

## 1.1 Overview

Tandem Finance is a personal finance management application designed for couples who want to organize, track, and understand their shared financial situation.

The application provides a centralized **Shared Space** where two partners can register monthly income and expenses, organize spending into joint category envelopes with budgets, monitor financial progress, and work toward common savings goals — with clear attribution of who paid and how costs are split.

The main objective is to make financial management simple, transparent, and collaborative.

Instead of relying on spreadsheets, notes, or separate banking applications, both partners can access the same financial overview and understand exactly where their money goes.

The application will also provide intelligent financial insights through **Tandem AI Co-pilot**, helping users identify spending patterns, detect unusual increases in expenses, and discover opportunities to save money.

## 1.2 Vision Statement

Build a simple and intelligent financial platform that helps couples make better financial decisions together.

The product should transform financial tracking from a repetitive administrative task into an easy habit that encourages transparency, financial awareness, and shared goals.

Brand voice is composed, transparent, and collaborative — tailored for modern couples navigating joint financial lives. The experience bridges personal autonomy with shared goals, favoring clarity and mutual trust over gamification clutter.

## 1.3 Core Principles

- **Simplicity:** Registering income and expenses should take only a few seconds (e.g. **New Expense** with ⌘K).
- **Transparency:** Both partners should have visibility into their shared financial situation.
- **Partner attribution:** Every relevant surface should make it clear who paid, who contributed, and what is shared.
- **Flexibility:** Users should be able to customize categories (envelopes), budgets, splits, and savings goals.
- **Awareness:** Users should understand how their spending changes over time.
- **Collaboration:** Financial decisions and goals should be managed together.
- **Intelligence:** AI should provide useful recommendations based on actual financial activity.

---

# 2. Target Users

## 2.1 Primary Users

The application initially targets couples who share some or all of their household expenses.

Examples:

- Couples living together.
- Partners sharing rent, groceries, utilities, and recreation expenses.
- Couples saving money for vacations, investments, or future purchases.
- People who want to understand how much they spend individually and together.

## 2.2 User Roles

The initial version supports two users belonging to the same household (Shared Space).

Both users have equal permissions.

Each user can:

- Register income.
- Register expenses.
- Edit and delete their transactions.
- View all household transactions.
- Create and manage categories and monthly budgets.
- Configure contribution splits (e.g. 50/50 or custom ratios).
- Create savings goals and record contributions.
- View financial reports and progress.
- Access AI Insights (Tandem Co-pilot).
- Manage notifications and household settings.

Each transaction should record which household member created it and who actually paid for it. Partner attribution should be visible throughout the UI via partner chips (Partner 1 / Partner 2 / Shared).

---

# 3. Core Product Features

## 3.1 Authentication and Household Management

Users need a simple authentication mechanism.

### Requirements (MVP)

- Register using email and password (**Create Account**).
- Login using email and password (**Sign In**).
- Logout.
- Password recovery (**Reset Password**).
- Basic user profile management.
- Create a household Shared Space and invite a partner (during signup or later from Settings & Household).

### Auth screens (aligned with design)

| Screen | Purpose |
|---|---|
| Sign In | Household email + password; link to forgot password and create account |
| Create Account | Account setup, optional partner email invite |
| Reset Password | Send reset link to household member email |

### Design-forward auth (post-MVP / aspirational in mockups)

The current mockups also show passkeys, Face ID, and Google/GitHub SSO. These are **not** required for MVP but may be added later if they remain in the design system.

### Household Workspace

After registration, users create a household and invite their partner.

Both users share the same financial workspace (labeled in the UI as **Shared Space** with both partner names).

The household owns its transactions, categories, budgets, and savings goals.

**Important:** Financial information must be isolated between households. A user should only access information belonging to their household.

---

## 3.2 Dashboard

The dashboard is the main application screen.

It should provide an immediate overview of the household's financial situation for the selected month.

### Global chrome (all authenticated screens)

Aligned with the design mockups:

- Brand wordmark **Tandem** + Shared Space subtitle (partner names).
- Primary CTA: **New Expense** (keyboard shortcut ⌘K).
- Month picker.
- Partner filter: **All Shared | Partner 1 | Partner 2**.
- Global search.
- Notification shortcut.
- Sidebar household members with default split indicator (e.g. 50/50).

### Financial Summary (KPI cards)

Display the following information (design labels in parentheses where they differ):

- Total combined income.
- Total expenses.
- Remaining balance / **Net Cash Flow Buffer** (income − expenses for the period; before savings allocations).
- Total savings / **Savings & Investing**.
- Monthly budget utilization.
- Difference compared to the previous month (absolute and %).

When savings contributions are shown in detail views, also distinguish **Available Balance (After Savings Allocations)** = income − expenses − savings contributions. See `docs/BUSINESS_RULES.md`.

### Visualizations

Include:

1. Income vs. expenses / monthly cash-flow trajectory chart.
2. Expenses by category chart.
3. Monthly spending trend.
4. Budget utilization overview (gauge / rings).
5. Recent transactions (Recent Activity).

### Dashboard Filters

- This month / current month.
- Previous month / last month.
- Custom date range (or quarter presets as shown in design).

### Proactive AI nudge

The dashboard may surface a short **Tandem AI Co-Pilot** banner with a timely insight (e.g. category pace vs. budget) and an optional action. This is a presentation of AI Insights, not a separate product area.

### Example

For a hypothetical household:

| Metric | Amount |
|---|---:|
| Monthly income | $2,500,000 |
| Monthly expenses | $1,750,000 |
| Remaining balance (Net Cash Flow Buffer) | $750,000 |
| Savings | $500,000 |

The dashboard should clearly distinguish between remaining balance and actual savings.

Money remaining in the household account is not necessarily money formally allocated to savings.

---

## 3.3 Income and Expense Management (Transactions)

This is one of the most important features.

Users should be able to register financial transactions quickly from the Transactions screen or the global **New Expense / Add Transaction** modal.

### Transaction Properties

Each transaction should contain:

- Unique identifier.
- Description / merchant.
- Amount.
- Transaction type: Income or Expense.
- Category.
- Transaction date.
- Household member who created it.
- Person who paid or received the money (**Who paid for this?**).
- Optional payment method.
- Optional notes / receipt attachment (receipt upload may be phased).
- Creation timestamp.
- Last updated timestamp.

### Transaction Operations

Users should be able to:

- Create transactions.
- Edit transactions.
- Delete transactions.
- View transaction details.
- Search transactions.
- Filter by category.
- Filter by transaction type.
- Filter by household member / partner.
- Filter by date range.

### Transaction Types

**Income examples:**
- Monthly salary.
- Freelance work.
- Bonuses.
- Additional income.
- Refunds.

**Expense examples:**
- Rent.
- Groceries.
- Utilities.
- Transportation.
- Recreation.
- Shopping.
- Healthcare.
- Subscriptions.

### Partner attribution and splits

Expense registration must support partner context that appears throughout the design:

- Record **who paid**.
- Support household default split (e.g. 50/50) and custom contribution ratios where budgets/goals require them.
- Show partner attribution chips on transaction list items (Partner 1, Partner 2, Shared/Split).

### Important Business Rule

Income and expenses must be treated differently.

An expense reduces the available balance, while income increases it.

The application should calculate financial summaries using actual transaction records rather than manually entered totals.

---

## 3.4 Categories & Budgets (Joint Envelopes)

Categories and monthly budgets are a **single navigation destination** in the product design: **Categories & Budgets**.

In the UI, category + budget units may be referred to as **Joint Envelopes** — a spending category with an optional monthly threshold.

Users must be able to create as many categories/envelopes as they need.

There should be no fixed limitation on the number of categories.

### Default Categories

The application should provide a few initial categories:

**Household**
- Rent.
- Electricity.
- Water.
- Internet.
- Gas.
- Maintenance.

**Food**
- Groceries.
- Restaurants.
- Takeaway.

**Lifestyle**
- Recreation.
- Entertainment.
- Shopping.
- Travel.

**Personal**
- Healthcare.
- Education.
- Personal expenses.

**Financial**
- Savings.
- Investments.
- Debt payments.

These categories should be editable.

### Category / Envelope Properties

- Name.
- Description (optional).
- Icon.
- Color.
- Category type.
- Monthly budget / threshold (optional).
- Contribution split preference (e.g. 50/50 vs income-ratio / custom) — aligned with design.
- Creation date.

### Category & Budget Operations

- Create category / envelope.
- Edit category.
- Delete category.
- Assign category to transactions.
- Configure category-specific monthly budgets.
- View spent vs. remaining vs. utilization %.
- Optional quick actions from design: rebalance / adjust from past month (may be AI-assisted later).

Users should be able to organize categories according to their own financial habits.

### Budget Indicators

Numeric thresholds (must match `docs/BUSINESS_RULES.md`):

- **Green (within):** utilization below 80%.
- **Amber (approaching):** utilization from 80% up to (but not including) 100%.
- **Rose (exceeded):** utilization at 100% or higher.

Users should see the percentage of their budget consumed.

### Example

| Category | Budget | Spent | Remaining |
|---|---:|---:|---:|
| Rent | $500,000 | $500,000 | $0 |
| Groceries | $300,000 | $220,000 | $80,000 |
| Recreation | $150,000 | $180,000 | -$30,000 |
| Transportation | $100,000 | $70,000 | $30,000 |

### Important Business Rule

A budget is a spending target, not an actual transaction.

Changing a budget must never modify historical transactions.

---

## 3.5 Financial Progress and Monthly Comparisons

This feature helps users understand their financial evolution (**Financial Progress** in navigation).

The application should compare the current month against previous months.

### Metrics

- Total income variation.
- Total expense variation.
- Savings variation / net savings growth.
- Spending by category (category-by-category shift).
- Monthly balance.
- Average monthly expenses.
- Savings rate / shared savings rate.

### Comparison Examples

- "You spent 15% more on groceries compared to last month."
- "Your recreation expenses decreased by 20%."
- "Your household savings increased by $100,000."
- "Your monthly expenses are higher than your three-month average."

### Historical Analysis

Allow users to visualize:

- Last 3 months.
- Last 6 months.
- Last 12 months / YTD.
- Custom periods.
- MoM comparison mode.

### Design-forward progress concepts (post-MVP unless prioritized)

Mockups also explore friction/equity scores, couple badges, and predictive runway. Treat these as optional enhancements; core MVP is reliable period comparisons and category shifts.

### Important Business Rule

Comparisons must use equivalent periods whenever possible.

For example, comparing a full previous month with only the first five days of the current month can produce misleading results.

The application should distinguish between absolute differences and percentage variations.

---

## 3.6 Notifications and Financial Alerts

The application should proactively notify users about important financial events (**Notifications** / Alerts Center).

### Alert Scenarios

**Spending increases**
- A category has increased significantly compared to the previous month.
- Total household expenses exceed the previous month's spending.
- An unusual expense has been registered.

**Budget alerts**
- A category reaches 80% of its budget.
- A category reaches 90% of its budget.
- A category reaches or exceeds 100% of its budget.

**Positive alerts**
- Household savings have increased.
- A savings goal has reached an important milestone.
- Expenses have decreased compared to the previous month.

**Partner activity** (aligned with design)
- Partner registered a notable transaction.
- Settlement / split-related updates when splitting is enabled.

### Notification Properties

- Title.
- Description.
- Notification type.
- Related category (optional).
- Creation date.
- Read/unread status.

### Notification Center

Users should be able to:

- View all notifications.
- Filter by type (e.g. All Alerts, Requires Action, Partner Activity, Budgets & Splits, Goals & Milestones, Security & Rules — as in design).
- Mark notifications as read / mark all as read.
- View unread notifications.
- Navigate to the related transaction, category, budget, or goal.
- Manage alert preferences.

### Important Business Rule

An increase in spending does not automatically mean overspending.

For example, rent increasing because of inflation is different from spending more than the established recreation budget.

Alerts should distinguish between:

1. Historical spending increases.
2. Budget limit warnings.
3. Unusual spending patterns.

---

## 3.7 Savings Goals

The application should allow couples to establish shared savings goals (**Savings Goals** / milestones).

### Example Goals

- Emergency fund / Safety Net.
- Vacation.
- Buying a car / Vehicle.
- Home improvements / Home Buy.
- Wedding.
- Future investments.
- Personal projects / Custom.

### Savings Goal Properties

- Goal name.
- Description.
- Target amount.
- Current saved amount.
- Target date / milestone horizon.
- Currency.
- Status.
- Monthly contribution split between partners (aligned with design).
- Creation date.

### Features

- Create savings goals (including from a **Create New Savings Goal** modal with common presets).
- Edit goals.
- Delete goals.
- Add contributions.
- Track progress and milestones.
- View remaining amount.
- Display estimated completion date when sufficient data is available.

### Visualization

Each goal should display:

- Target amount.
- Current amount.
- Remaining amount.
- Percentage completed.
- Progress bar / milestone markers.

Example:

**Vacation Fund**

Target: $1,500,000  
Saved: $600,000  
Remaining: $900,000  
Progress: 40%

Contributions should be tracked independently from ordinary expenses to avoid double-counting money transfers as spending.

### Design-forward savings concepts (post-MVP)

Mockups show destination vaults with APY, autopilot round-ups, end-of-month sweeps, and trophy cases. These are **aspirational** and outside the initial product scope (see Future Enhancements). MVP focuses on manual goals, contributions, and progress.

---

## 3.8 AI Insights (Tandem Co-pilot)

The application should include an AI-powered financial assistant under the navigation label **AI Insights**.

In product copy and UI, the conversational surface is **Tandem Co-pilot** (also referred to as Tandem AI Co-Pilot on dashboard nudges).

Its purpose is to analyze household financial activity and provide useful, understandable recommendations.

This feature should make financial data actionable.

### AI Capabilities

**Spending Analysis**

Identify categories where expenses are increasing.

Example:

"Your food expenses increased by 18% compared to last month. Most of the increase comes from restaurant spending."

**Savings Recommendations**

Identify possible opportunities to reduce spending.

Example:

"Your household could save approximately $50,000 per month by reducing restaurant expenses by 10%."

**Financial Summaries**

Generate monthly summaries.

Example:

"This month, your household received $2,500,000 and spent $1,750,000. Your largest expense category was housing."

**Budget Recommendations**

Suggest realistic budgets based on historical spending (including envelope rebalance suggestions).

**Conversational Interface**

Users should be able to ask questions such as:

- How much did we spend on food this month?
- Which category increased the most?
- How much did we save compared to last month?
- How much can we spend on recreation this month?
- What are our biggest opportunities to save money?

### Design-forward AI concepts (post-MVP)

Mockups also show a What-If Scenario Engine and Autopilot actions that automatically move money. MVP AI should **suggest**, not automatically modify budgets, transactions, or transfers.

### AI Principles

- Recommendations must be based on actual household data.
- The AI must not invent financial information.
- The AI should explain why it makes a recommendation.
- Recommendations should be practical and understandable.
- Financial information must remain private and restricted to the household.

AI should provide suggestions, not automatically modify budgets or transactions.

---

## 3.9 Settings & Household

Navigation includes **Settings & Household** for:

- User profile.
- Household membership and partner invite.
- Default currency and locale.
- Default contribution split (e.g. 50/50).
- Notification / alert preferences.
- Security (password change, logout).

A dedicated Settings mockup is not yet in `docs/design/`; behavior should follow this PRD and the shared chrome from other screens.

---

# 4. Currency and Regional Considerations

The initial application should support Argentine pesos (ARS) as the default currency.

However, the data model should be designed to support additional currencies in the future.

**Note on design mockups:** Current HTML mockups use USD (`$`) amounts for presentation. Product behavior and MVP defaults remain ARS unless the team explicitly changes market scope. UI formatting should follow the household's default currency.

### Initial Requirements

- Default currency: ARS.
- Currency formatting according to locale.
- Support for decimal values.
- Support for large amounts.
- Possibility of adding USD in future versions.

### Important Business Rule

Transactions should preserve their original currency.

If multi-currency support is introduced, the application must distinguish between the original amount and the converted amount.

Exchange rates should never be applied retroactively without an explicit conversion rule.

---

# 5. Application Navigation

The application should have a simple and consistent navigation structure matching the designed sidebar.

### Main Navigation

1. Dashboard.
2. Transactions.
3. Categories & Budgets.
4. Financial Progress.
5. Savings Goals.
6. AI Insights.
7. Notifications.
8. Settings & Household.

### Global actions

- **New Expense** (primary CTA, ⌘K).
- Month picker.
- Partner filter (All Shared / Partner 1 / Partner 2).
- Search.
- Notifications shortcut.

### User / Household Profile

The application should display the two household members in the sidebar and provide access to profile / Shared Space switching from the footer control.

### Designed screens inventory

| Area | Design folder |
|---|---|
| Sign In | `docs/design/sign_in_tandem_finance/` |
| Create Account | `docs/design/create_account_tandem_finance/` |
| Reset Password | `docs/design/reset_password_tandem_finance/` |
| Dashboard | `docs/design/main_dashboard/` |
| Transactions + Add modal | `docs/design/transactions_add_expense_modal/` |
| Categories & Budgets | `docs/design/categories_monthly_budgets/` |
| Financial Progress | `docs/design/financial_progress_comparison/` |
| Savings Goals | `docs/design/savings_goals_milestones/` |
| Create Goal modal | `docs/design/savings_goals_create_new_goal_modal/` |
| AI Insights | `docs/design/ai_financial_insights/` |
| Notifications | `docs/design/notifications_financial_alerts_center/` |

---

# 6. MVP — Minimum Viable Product

The first release should focus on the essential functionality.

The objective is to have a working application that two people can actually use to manage their finances.

Design mockups may show richer neo-bank metaphors (vaults, APY, bank sync, autopilot). MVP deliberately ships the collaborative tracker underneath that vision.

## Phase 1 — Foundation

- User registration.
- Email and password login.
- Password recovery.
- Household / Shared Space creation.
- Partner invitation.
- Shared household workspace.
- Basic user profiles.
- Settings & Household basics.

## Phase 2 — Financial Management

- Create income transactions.
- Create expense transactions (including who paid).
- Edit and delete transactions.
- Transaction history with partner attribution.
- Custom categories / envelopes.
- Category management.
- Monthly financial summaries.
- Partner filter (All Shared / Partner 1 / Partner 2).

## Phase 3 — Budgets and Progress

- Monthly category budgets on Categories & Budgets.
- Budget utilization indicators.
- Income vs. expense charts.
- Spending by category.
- Current vs. previous month comparison.
- Historical financial data (Financial Progress).

## Phase 4 — Alerts

- Budget threshold alerts.
- Increased spending notifications.
- Monthly spending comparisons.
- Notification center with read/unread.

## Phase 5 — Savings

- Create savings goals.
- Register contributions (with optional partner split metadata).
- Track progress / milestones.
- Display savings summaries.

## Phase 6 — AI Integration

- Monthly financial summaries.
- Spending analysis.
- Savings recommendations.
- Conversational Tandem Co-pilot (AI Insights).
- Optional dashboard AI nudge banner.

AI integration should be introduced after the core financial data and calculations are reliable.

---

# 7. Future Enhancements

The following features appear in design exploration or are outside the initial MVP, but should be considered when designing the architecture.

### Recurring Transactions

Allow users to configure recurring transactions.

Examples:
- Monthly rent.
- Electricity bills.
- Internet subscriptions.
- Monthly salaries.

### Payment Reminders

Notify users about upcoming recurring payments.

### Financial Reports

Generate downloadable monthly reports in PDF or CSV format (Export actions in mockups).

### Multi-Currency Support

Support ARS, USD, EUR, and additional currencies.

### Advanced Expense Splitting & Settlements

MVP already includes who-paid attribution, partner filters, household default split display, and optional envelope/goal contribution-split preferences.

Still future:

- Equal vs custom split toggles per transaction that create balances owed.
- Settlement ledgers between partners.
- Partner approval workflows for large purchases.

### Receipt Attachments & Import

- Attach images or documents to transactions.
- CSV / statement import.
- Instant receipt capture integrations (shown as design tease).

### Bank Integration

Explore integrations with financial institutions or banking APIs where supported (mockups show “bank accounts synced” and read-only sync trust copy).

### Savings Automation & Vault Metaphors

- Round-ups and end-of-month sweeps.
- Destination vaults / APY presentation.
- Autopilot contribution rules.

### Auth Enhancements

- Passkeys / Face ID.
- Google / GitHub SSO.

### Advanced AI

- Predict monthly expenses.
- Estimate future savings.
- Identify unusual transactions.
- Suggest budget adjustments / smart allocation.
- What-if scenario engine.
- Analyze long-term spending patterns.
- Friction / equity indices (design-only metrics).

---

# 8. Data Model — Conceptual Entities

The following entities represent the initial domain model.

They are conceptual definitions, not final database schemas.

### User

Represents an individual application user.

Properties:
- id
- name
- email
- password_hash
- created_at

### Household

Represents the shared financial workspace (Shared Space).

Properties:
- id
- name
- default_currency
- default_split_ratio (optional; e.g. 50/50)
- created_at

### HouseholdMember

Connects users to households.

Properties:
- id
- household_id
- user_id
- role
- display_color / partner_slot (Partner 1 vs Partner 2 attribution)
- joined_at

### Transaction

Represents an income or expense.

Properties:
- id
- household_id
- category_id
- created_by
- paid_by (optional)
- description
- amount
- currency
- type
- payment_method (optional)
- transaction_date
- notes
- created_at
- updated_at

### Category

Represents a customizable financial category / envelope.

Properties:
- id
- household_id
- name
- description
- icon
- color
- type
- created_at

### Budget

Represents a monthly spending limit for a category/envelope.

Properties:
- id
- household_id
- category_id (optional)
- amount
- currency
- month
- year
- contribution_split (optional)
- created_at

### SavingsGoal

Represents a financial objective.

Properties:
- id
- household_id
- name
- description
- target_amount
- current_amount
- currency
- target_date
- status
- contribution_split (optional)
- created_at

### SavingsContribution

Represents an individual contribution toward a savings goal.

Properties:
- id
- savings_goal_id
- user_id
- amount
- contribution_date
- notes

### Notification

Represents a financial alert.

Properties:
- id
- household_id
- user_id (optional)
- title
- description
- type
- is_read
- created_at

---

# 9. Business Rules and Financial Calculations

Financial calculations must be consistent throughout the application.

**Authoritative detail:** `docs/BUSINESS_RULES.md`. This section summarizes the formulas used in product and design.

### Total Income

The sum of all income transactions within the selected period.

### Total Expenses

The sum of all expense transactions within the selected period.

### Net Cash Flow Buffer (Remaining Balance Before Savings)

Income − Expenses

Primary dashboard remaining-balance metric. Money remaining before allocating contributions toward savings goals.

### Available Balance (After Savings Allocations)

Income − Expenses − Savings Contributions

Money remaining after expenses and savings allocations for the period.

### Savings Rate

(Income − Expenses) / Income × 100

If income is zero, the application should avoid division by zero and display an appropriate empty state.

### Monthly Spending Variation

(Current Month Expenses − Previous Month Expenses) / Previous Month Expenses × 100

If previous month expenses are zero, percentage variation should be displayed as unavailable rather than producing an invalid result.

### Category Budget Utilization

Amount Spent / Category Budget × 100

Status bands: below 80% within, 80–99.99% approaching, 100%+ exceeded. Alerts at 80%, 90%, and 100%+.

### Savings Goal Progress

Current Saved Amount / Target Amount × 100

### Additional Rules

- All financial calculations should use the selected date range.
- Partner filters must restrict aggregates and lists to the selected member when not on All Shared.
- Transactions must belong to a household.
- Categories must belong to the same household as their transactions.
- Deleting a category must not silently delete historical financial records.
- Budget changes must not alter historical expenses.
- Savings contributions must not be counted as ordinary expenses when they represent transfers between household accounts.
- Financial records must not be accessible across different households.

---

# 10. UX and Design Principles

The application should provide a premium, modern fintech experience aligned with `docs/design/tandem_finance/DESIGN.md`.

### Visual Identity

- Brand: **Tandem Finance** (wordmark **Tandem** in chrome).
- Minimalist, refined product UI inspired by modern fintech / neobank clarity.
- Light theme as the initial default; cool-tinted paper canvas with white functional cards.
- Typography: **Hanken Grotesk** for display, headlines, and financial stats; **Inter** for body, labels, and metadata.
- Tabular figures for all monetary amounts.
- Primary ink / high-emphasis actions: deep slate (`#0F172A`).
- Secondary interactive accent: indigo (`#4F46E5` / design secondary).
- Emerald for positive / inflow; rose for expense / over-budget; amber for attention.
- Partner attribution colors: Partner 1 indigo/violet; Partner 2 teal/emerald; Shared slate.
- Rounded cards, hairline borders, and soft ambient elevation (no harsh shadows).
- Clear charts, progress rings, and budget indicators.

### Usability

- Fast transaction registration (global New Expense).
- Clear financial summaries.
- Minimal navigation complexity (combined Categories & Budgets).
- Consistent interface across all screens via shared sidebar/header chrome.
- Useful empty states.
- Confirmation before destructive actions.
- Clear loading and error states.
- Responsive design for desktop and mobile (design breakpoints: mobile under 768px, tablet 768–1023px, desktop 1024px and up).

### Mobile Experience

Mobile users should be able to:

- Check the household balance.
- Register an expense quickly.
- View recent transactions.
- Check category budgets / envelopes.
- Review notifications.
- Track savings goals.
- Use sticky bottom navigation or an equivalent compact nav pattern from the design system.

---

# 11. Security and Privacy

Financial information is sensitive and must be protected.

Requirements:

- Secure password handling.
- Authenticated access to financial information.
- Household-level data isolation.
- Server-side authorization.
- Validation of all financial inputs.
- Protection against unauthorized transaction access.
- Secure handling of AI requests and financial context.
- No exposure of financial data between unrelated households.

The application must never rely exclusively on frontend authorization.

Design trust copy (bank-grade / SOC2 / FDIC language in mockups) is aspirational branding until corresponding certifications and integrations exist; product claims must match shipped capabilities.

---

# 12. Success Metrics

The application should be evaluated based on its usefulness in everyday financial management.

Potential success indicators:

- Both household members actively use the application.
- Income and expenses are registered consistently.
- Users can understand their monthly financial situation quickly.
- Users regularly review their budgets / envelopes.
- Users identify spending increases through notifications.
- Savings goals show measurable progress.
- AI recommendations (Tandem Co-pilot) provide actionable value.
- Partner attribution makes shared vs individual spending clear.

---

# 13. Product Scope and Development Philosophy

The initial objective is not to build a complete banking platform.

It is to build a reliable, simple, and useful shared finance management application branded as **Tandem Finance**.

Design mockups may explore vault, APY, bank-sync, and autopilot metaphors; those remain future enhancements unless explicitly promoted into MVP.

Development should prioritize:

1. Correct financial calculations.
2. Secure shared household data.
3. Simple transaction management with partner attribution.
4. Flexible categories and budgets (Joint Envelopes).
5. Useful financial visualizations.
6. Reliable monthly comparisons.
7. Meaningful notifications.
8. AI-powered recommendations (AI Insights / Co-pilot).

The architecture should allow future expansion without introducing unnecessary complexity in the first release.

**Final Product Goal:**

Give two people a shared, transparent, and intelligent view of their finances in Tandem — helping them understand where their money goes, spend more intentionally, and achieve their financial goals together.
