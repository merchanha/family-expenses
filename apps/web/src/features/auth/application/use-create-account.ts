import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CurrentHouseholdResponse, RegisterInput } from '@tandem/shared';
import { tokenStorage } from '@/lib/auth/token-storage';
import { setFlashNotice } from '@/lib/flash-notice';
import { useSession } from '@/lib/auth/session-context';
import { acceptInvite, createHousehold, createInvite, householdKeys, toSessionHousehold } from '@/features/households';
import { register } from '@/features/auth/infrastructure/auth-api';

export interface CreateAccountInput extends RegisterInput {
  /** New Shared Space name (ignored when joining through an invite). */
  householdName?: string;
  /** Optional partner invite sent right after the Shared Space is created. */
  partnerEmail?: string;
  /** Invite token from /join → join that household instead of creating one. */
  inviteToken?: string;
}

/**
 * Register, then create the Shared Space (or accept the invite), then optionally
 * invite the partner. The session only starts at the end so the public-route
 * guard doesn't redirect mid-flow. If only the household step fails the user is
 * still signed in and lands on onboarding to retry; a failed partner invite can
 * be re-sent from Settings & Household.
 */
export function useCreateAccount() {
  const { startSession } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdName, partnerEmail, inviteToken, ...account }: CreateAccountInput) => {
      const session = await register(account);
      tokenStorage.setAccessToken(session.accessToken);

      let household: CurrentHouseholdResponse | null = null;
      try {
        if (inviteToken) household = await acceptInvite({ token: inviteToken });
        else if (householdName) household = await createHousehold({ name: householdName });
      } catch {
        household = null;
      }
      if (household && !inviteToken && partnerEmail) {
        try {
          await createInvite({ email: partnerEmail });
        } catch {
          // Non-blocking: tell them on landing; Settings lets them retry (FOR-97).
          setFlashNotice(
            `We couldn't send the invite to ${partnerEmail}. You can send it from Settings & Household.`,
          );
        }
      }
      return { session, household };
    },
    onSuccess: ({ session, household }) => {
      if (household) queryClient.setQueryData(householdKeys.current(), household);
      startSession({ ...session, household: household ? toSessionHousehold(household) : session.household });
    },
  });
}
