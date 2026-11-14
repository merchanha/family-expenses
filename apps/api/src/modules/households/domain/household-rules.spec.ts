import { assertCanAcceptInvite, assertCanInvite, isInviteUsable } from './household-rules';
import {
  CannotInviteSelfError,
  HouseholdFullError,
  InviteEmailMismatchError,
  InviteNotUsableError,
  OwnerOnlyError,
} from './household.errors';

const now = new Date('2026-11-14T12:00:00Z');
const later = new Date('2026-11-15T12:00:00Z');

describe('household rules', () => {
  it('assertCanInvite', () => {
    const ok = { role: 'OWNER' as const, memberCount: 1, inviterEmail: 'a@x.io', inviteeEmail: 'b@x.io' };
    expect(() => assertCanInvite(ok)).not.toThrow();
    expect(() => assertCanInvite({ ...ok, role: 'MEMBER' })).toThrow(OwnerOnlyError);
    expect(() => assertCanInvite({ ...ok, memberCount: 2 })).toThrow(HouseholdFullError);
    expect(() => assertCanInvite({ ...ok, inviteeEmail: 'A@X.io' })).toThrow(CannotInviteSelfError);
  });

  it('isInviteUsable: pending and strictly before expiry', () => {
    expect(isInviteUsable({ status: 'PENDING', expiresAt: later }, now)).toBe(true);
    expect(isInviteUsable({ status: 'PENDING', expiresAt: now }, now)).toBe(false);
    expect(isInviteUsable({ status: 'ACCEPTED', expiresAt: later }, now)).toBe(false);
    expect(isInviteUsable({ status: 'REVOKED', expiresAt: later }, now)).toBe(false);
  });

  it('assertCanAcceptInvite', () => {
    const invite = { status: 'PENDING' as const, expiresAt: later, email: 'b@x.io' };
    expect(() => assertCanAcceptInvite({ invite, userEmail: 'B@x.io', memberCount: 1, now })).not.toThrow();
    expect(() => assertCanAcceptInvite({ invite: { ...invite, status: 'EXPIRED' }, userEmail: 'b@x.io', memberCount: 1, now })).toThrow(InviteNotUsableError);
    expect(() => assertCanAcceptInvite({ invite, userEmail: 'c@x.io', memberCount: 1, now })).toThrow(InviteEmailMismatchError);
    expect(() => assertCanAcceptInvite({ invite, userEmail: 'b@x.io', memberCount: 2, now })).toThrow(HouseholdFullError);
  });
});
