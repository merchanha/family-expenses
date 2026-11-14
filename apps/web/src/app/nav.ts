import {
  ArrowLeftRight,
  Bell,
  LayoutDashboard,
  PieChart,
  PiggyBank,
  Settings,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  /** Page title shown in the header. */
  title: string;
  to: string;
  icon: LucideIcon;
  /** Small pill rendered next to the label (design: "AI"). */
  badge?: string;
}

/** Sidebar navigation — order & labels from design/main_dashboard; routes from roadmap §3. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', title: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', title: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Categories & Budgets', title: 'Categories & Budgets', to: '/categories', icon: PieChart },
  { label: 'Financial Progress', title: 'Financial Progress', to: '/progress', icon: TrendingUp },
  { label: 'Savings Goals', title: 'Savings Goals', to: '/goals', icon: PiggyBank },
  { label: 'AI Insights', title: 'AI Insights', to: '/insights', icon: Sparkles, badge: 'AI' },
  { label: 'Notifications', title: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings & Household', title: 'Settings & Household', to: '/settings', icon: Settings },
];
