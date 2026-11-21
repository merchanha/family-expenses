import {
  Banknote,
  Briefcase,
  Car,
  CreditCard,
  Drama,
  Ellipsis,
  GraduationCap,
  House,
  Landmark,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Tag,
  Tv,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Categories store a Material Symbols name (design mockups, DEFAULT_CATEGORIES).
 * We render with lucide, so map the names we offer; anything else falls back to a tag.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: House,
  shopping_cart: ShoppingCart,
  bolt: Zap,
  directions_car: Car,
  theater_comedy: Drama,
  medical_services: Stethoscope,
  shopping_bag: ShoppingBag,
  subscriptions: Tv,
  flight: Plane,
  school: GraduationCap,
  account_balance: Landmark,
  more_horiz: Ellipsis,
  payments: Banknote,
  work: Briefcase,
  add_card: CreditCard,
  sell: Tag,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Tag;
}

/** Swatches offered when creating a category (stored as hex on the category itself). */
export const CATEGORY_COLORS = [
  '#4b41e1',
  '#0c9488',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#565e74',
] as const;
