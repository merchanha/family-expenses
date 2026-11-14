import { describe, expect, it } from 'vitest';
import { memberInitials, memberLabel, splitLabel, toSessionHousehold } from '@/features/households/domain/member-display';
import { currentHousehold } from '@/test/fixtures';

describe('member display', () => {
  it('prefers the display name and falls back to the account name', () => {
    expect(memberLabel({ name: 'Alex Morgan', displayName: 'Alex' })).toBe('Alex');
    expect(memberLabel({ name: 'Alex Morgan', displayName: null })).toBe('Alex Morgan');
    expect(memberLabel({ name: 'Alex Morgan', displayName: '  ' })).toBe('Alex Morgan');
  });

  it('builds initials from first and last word', () => {
    expect(memberInitials({ name: 'alex de la morgan', displayName: null })).toBe('AM');
    expect(memberInitials({ name: 'Maya', displayName: null })).toBe('M');
  });

  it('formats the default split with Partner 1 first', () => {
    expect(splitLabel(50)).toBe('50/50');
    expect(splitLabel(60)).toBe('60/40');
  });

  it('derives the session household summary from a household response', () => {
    expect(toSessionHousehold(currentHousehold())).toEqual({
      id: 'h1',
      name: 'Alex & Maya',
      partnerSlot: 'PARTNER_1',
      role: 'OWNER',
    });
  });
});
