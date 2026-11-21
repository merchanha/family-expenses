import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiErrorCode, createInviteSchema, type CreateInviteInput, type CurrentHouseholdResponse } from '@tandem/shared';
import { Copy, Mail } from 'lucide-react';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { useCreateInvite } from '@/features/households/application/use-create-invite';
import { useRevokeInvite } from '@/features/households/application/use-revoke-invite';
import { memberLabel, PARTNER_SLOT_LABEL } from '@/features/households/domain/member-display';
import { PartnerAvatar } from '@/features/households/presentation/components/partner-avatar';
import { SettingsSection } from '@/features/households/presentation/components/settings/settings-section';

const DATE = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

function InviteForm({ hasPending }: { hasPending: boolean }) {
  const invite = useCreateInvite();
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<CreateInviteInput>({ resolver: zodResolver(createInviteSchema), defaultValues: { email: '' } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setInviteUrl(null);
    try {
      const res = await invite.mutateAsync(values);
      setInviteUrl(res.inviteUrl);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.CANNOT_INVITE_SELF) {
        form.setError('email', { type: 'server', message: "Use your partner's email, not yours." });
        return;
      }
      if (err instanceof ApiError && err.code === ApiErrorCode.OWNER_ONLY) {
        setFormError('Only the Shared Space owner can invite a partner.');
        return;
      }
      setFormError(applyServerErrors(err, form.setError, ['email']));
    }
  });

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md border-t border-hairline pt-space-md">
      <FormAlert message={formError} />
      {inviteUrl && (
        <div className="flex flex-col gap-space-sm">
          <FormAlert tone="success" message="Invitation sent. You can also share this link directly:" />
          <div className="flex gap-space-sm">
            <Input readOnly value={inviteUrl} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="secondary" className="h-11" onClick={copy}>
              <Copy aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}
      <FormField
        label="Partner's email"
        error={errors.email?.message}
        hint={hasPending ? 'Sending a new invitation replaces the pending one.' : 'They get a link to join this Shared Space.'}
      >
        <Input type="email" autoComplete="off" placeholder="partner@example.com" {...form.register('email')} />
      </FormField>
      <div>
        <Button type="submit" disabled={invite.isPending}>
          <Mail aria-hidden="true" />
          {invite.isPending ? 'Sending…' : hasPending ? 'Send new invitation' : 'Invite partner'}
        </Button>
      </div>
    </form>
  );
}

export function MembersSection({ data }: { data: CurrentHouseholdResponse }) {
  const { members, invites, me } = data;
  const pending = invites[0];
  const isFull = members.length >= 2;
  const isOwner = me.role === 'OWNER';
  const revoke = useRevokeInvite();
  const [revokeError, setRevokeError] = useState<string | null>(null);

  return (
    <SettingsSection title="Household members" description="Both partners have equal access to all Shared Space data.">
      <ul className="flex flex-col gap-space-sm">
        {members.map((m) => (
          <li key={m.id} className="flex min-w-0 items-center gap-space-md">
            <PartnerAvatar member={m} className="size-10" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label-md text-on-surface">
                {memberLabel(m)}
                {m.userId === me.userId && <span className="text-on-surface-variant"> (you)</span>}
              </span>
              <span className="truncate text-body-sm text-on-surface-variant">
                {PARTNER_SLOT_LABEL[m.partnerSlot]} · {m.email}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!isFull && pending && (
        <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-base bg-surface-container-low px-space-md py-space-sm">
          <p className="text-body-sm text-on-surface-variant">
            Invitation pending for <span className="font-medium text-on-surface">{pending.email}</span> — expires{' '}
            {DATE.format(new Date(pending.expiresAt))}.
          </p>
          {isOwner && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={revoke.isPending}
              onClick={async () => {
                setRevokeError(null);
                try {
                  await revoke.mutateAsync(pending.id);
                } catch {
                  setRevokeError("Couldn't cancel the invitation. Please try again.");
                }
              }}
            >
              {revoke.isPending ? 'Cancelling…' : 'Cancel invitation'}
            </Button>
          )}
        </div>
      )}
      <FormAlert message={revokeError} />
      {!isFull && isOwner && <InviteForm hasPending={!!pending} />}
      {!isFull && !isOwner && (
        <p className="text-body-sm text-on-surface-variant">Only the Shared Space owner can invite a partner.</p>
      )}
    </SettingsSection>
  );
}
