import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { ApiErrorCode, type InvitePreviewResponse } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth/session-context';
import { NETWORK_ERROR_MESSAGE } from '@/lib/form-errors';
import { useAcceptInvite } from '@/features/households/application/use-accept-invite';
import { useInvitePreview } from '@/features/households/application/use-invite-preview';

function acceptErrorMessage(err: unknown, invite: InvitePreviewResponse): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (err.status === 0) return NETWORK_ERROR_MESSAGE;
  switch (err.code) {
    case ApiErrorCode.INVITE_EMAIL_MISMATCH:
      return `This invitation was sent to ${invite.email}. Sign in with that email to accept it.`;
    case ApiErrorCode.ALREADY_IN_HOUSEHOLD:
      return 'You already belong to a Shared Space.';
    case ApiErrorCode.HOUSEHOLD_FULL:
      return 'This Shared Space already has two partners.';
    case ApiErrorCode.INVITE_NOT_FOUND:
    case ApiErrorCode.INVITE_NOT_USABLE:
      return 'This invitation is no longer valid. Ask your partner to send a new one.';
    default:
      return err.message;
  }
}

/** /join?token=… — the link in the partner invitation email. */
export function JoinHouseholdPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { state } = useSession();
  const preview = useInvitePreview(token);
  const accept = useAcceptInvite();
  const [error, setError] = useState<string | null>(null);

  if (!token) return <Navigate to="/sign-in" replace />;

  const here = `/join?token=${encodeURIComponent(token)}`;
  const usable = preview.data?.status === 'PENDING';

  let body;
  if (preview.isPending || state.status === 'loading') {
    body = <Skeleton className="h-24 w-full" aria-label="Loading invitation" />;
  } else if (preview.isError || !usable) {
    body = <FormAlert message="This invitation link is invalid or has expired. Ask your partner to send a new one." />;
  } else if (state.status === 'anonymous') {
    body = (
      <div className="flex flex-col gap-space-sm">
        <Button asChild size="lg" className="h-12 text-label-md">
          <Link to={`/create-account?invite=${encodeURIComponent(token)}`}>Create account & join</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link to={`/sign-in?redirect=${encodeURIComponent(here)}`}>I already have an account</Link>
        </Button>
      </div>
    );
  } else if (state.household) {
    body = (
      <div className="flex flex-col gap-space-md">
        <FormAlert message={`You're already in the Shared Space "${state.household.name}".`} />
        <Button asChild variant="secondary">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  } else {
    const invite = preview.data!;
    body = (
      <div className="flex flex-col gap-space-md">
        <FormAlert message={error} />
        <Button
          size="lg"
          className="h-12 text-label-md"
          disabled={accept.isPending}
          onClick={async () => {
            setError(null);
            try {
              // Session gets the household; RequireNoHousehold/RequireAuth handle the rest.
              await accept.mutateAsync({ token });
            } catch (err) {
              setError(acceptErrorMessage(err, invite));
            }
          }}
        >
          {accept.isPending ? 'Joining…' : `Join ${invite.householdName}`}
        </Button>
      </div>
    );
  }

  if (accept.isSuccess) return <Navigate to="/dashboard" replace />;

  return (
    <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-level-2">
      <div className="h-1 bg-linear-to-r from-partner-1 to-partner-2" aria-hidden="true" />
      <div className="flex flex-col gap-space-lg p-space-lg md:p-space-xl">
        <header className="flex flex-col gap-space-sm">
          <span className="flex size-10 items-center justify-center rounded-base bg-partner-2-container text-on-partner-2-container">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <h1 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">Accept Partner Invite</h1>
          <p className="text-body-md text-on-surface-variant">
            {preview.data && usable
              ? `${preview.data.invitedByName} invited ${preview.data.email} to share "${preview.data.householdName}" on Tandem.`
              : 'Join your partner’s Shared Space on Tandem.'}
          </p>
        </header>
        {body}
      </div>
    </section>
  );
}
