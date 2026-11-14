import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('keeps custom type-scale sizes alongside text colors', () => {
    expect(cn('text-primary-foreground', 'text-label-md')).toBe('text-primary-foreground text-label-md');
    expect(cn('text-sm', 'text-label-md text-on-surface')).toBe('text-label-md text-on-surface');
  });
});
