import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/features/auth/application/redirect-target';

describe('safeRedirect', () => {
  it('keeps in-app paths with query', () => {
    expect(safeRedirect('/transactions?month=2026-11')).toBe('/transactions?month=2026-11');
  });
  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/sign-in', '/create-account?x=1'])(
    'falls back to /dashboard for %s',
    (target) => {
      expect(safeRedirect(target)).toBe('/dashboard');
    },
  );
});
