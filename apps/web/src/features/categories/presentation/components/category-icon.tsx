import { categoryIcon } from '@/features/categories/domain/category-icons';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  icon: string | null;
  /** The category's own hex color (user data, not a design token). */
  color: string | null;
  className?: string;
}

/** Rounded icon tile tinted with the category color. Decorative: the name is always shown next to it. */
export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  const Icon = categoryIcon(icon);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-on-surface-variant',
        className,
      )}
      // Category color is per-row data, so it can't be a static token class.
      style={color ? { color, backgroundColor: `${color}1a` } : undefined}
    >
      <Icon className="size-5" />
    </span>
  );
}
