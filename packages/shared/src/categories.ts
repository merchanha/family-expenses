import type { TransactionType } from './enums';

export interface DefaultCategoryTemplate {
  name: string;
  type: TransactionType;
  icon: string; // Material Symbols name (matches design mockups)
  color: string; // hex
}

/** Default envelopes per BUSINESS_RULES.md "Default Expense/Income Categories". */
export const DEFAULT_CATEGORIES: readonly DefaultCategoryTemplate[] = [
  { name: 'Rent & Housing', type: 'EXPENSE', icon: 'home', color: '#4b41e1' },
  { name: 'Groceries & Food', type: 'EXPENSE', icon: 'shopping_cart', color: '#0c9488' },
  { name: 'Utilities & Services', type: 'EXPENSE', icon: 'bolt', color: '#f59e0b' },
  { name: 'Transportation', type: 'EXPENSE', icon: 'directions_car', color: '#3b82f6' },
  { name: 'Recreation & Entertainment', type: 'EXPENSE', icon: 'theater_comedy', color: '#ec4899' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'medical_services', color: '#ef4444' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'shopping_bag', color: '#8b5cf6' },
  { name: 'Subscriptions', type: 'EXPENSE', icon: 'subscriptions', color: '#6366f1' },
  { name: 'Travel', type: 'EXPENSE', icon: 'flight', color: '#14b8a6' },
  { name: 'Education & Personal', type: 'EXPENSE', icon: 'school', color: '#a855f7' },
  { name: 'Savings, Investments & Debt', type: 'EXPENSE', icon: 'account_balance', color: '#565e74' },
  { name: 'Other', type: 'EXPENSE', icon: 'more_horiz', color: '#76777d' },
  { name: 'Salary', type: 'INCOME', icon: 'payments', color: '#0c9488' },
  { name: 'Freelance', type: 'INCOME', icon: 'work', color: '#4b41e1' },
  { name: 'Additional Income', type: 'INCOME', icon: 'add_card', color: '#3b82f6' },
  { name: 'Other Income', type: 'INCOME', icon: 'more_horiz', color: '#76777d' },
];
