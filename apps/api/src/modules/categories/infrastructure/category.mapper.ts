import type { Category } from '@tandem/shared';
import type { CategoryRecord } from '../domain/category';

export const toCategoryResponse = (c: CategoryRecord): Category => ({
  id: c.id,
  name: c.name,
  description: c.description,
  icon: c.icon,
  color: c.color,
  type: c.type,
  isDefault: c.isDefault,
  isActive: c.isActive,
  transactionCount: c.transactionCount,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});
