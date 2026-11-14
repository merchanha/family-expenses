import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import {
  ApiErrorCode,
  emailSchema,
  householdNameSchema,
  PASSWORD_MIN_LENGTH,
  registerSchema,
  z,
} from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { useCreateAccount } from '@/features/auth/application/use-create-account';
import { useInvitePreview } from '@/features/households';
import { AuthCard } from '@/features/auth/presentation/components/auth-card';

// Form-only fields extend the shared register schema (apps/web/CLAUDE.md §10).
const optionalEmail = z.union([z.literal(''), emailSchema]);

const createSpaceSchema = registerSchema
  .extend({ householdName: householdNameSchema, partnerEmail: optionalEmail })
  .refine((v) => !v.partnerEmail || v.partnerEmail !== v.email, {
    path: ['partnerEmail'],
    message: "Use your partner's email, not yours",
  });

const joinSpaceSchema = registerSchema.extend({ householdName: z.string(), partnerEmail: z.string() });

type CreateAccountForm = z.input<typeof createSpaceSchema>;
const FIELDS = ['name', 'email', 'password', 'householdName', 'partnerEmail'] as const;

export function CreateAccountPage() {
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  const invite = useInvitePreview(inviteToken);
  const joining = !!inviteToken;

  const createAccount = useCreateAccount();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateAccountForm>({
    resolver: zodResolver(joining ? joinSpaceSchema : createSpaceSchema),
    defaultValues: { name: '', email: '', password: '', householdName: '', partnerEmail: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createAccount.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
        ...(joining
          ? { inviteToken: inviteToken! }
          : { householdName: values.householdName, partnerEmail: values.partnerEmail || undefined }),
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.code === ApiErrorCode.EMAIL_TAKEN)) {
        form.setError('email', { type: 'server', message: 'An account with this email already exists. Sign in instead.' });
        return;
      }
      setFormError(
        applyServerErrors(err, form.setError, FIELDS, { 429: 'Too many attempts. Wait a minute and try again.' }),
      );
    }
  });

  const pending = isSubmitting || createAccount.isPending;
  const search = params.toString() ? `?${params.toString()}` : '';

  return (
    <AuthCard
      showTabs
      eyebrow={joining ? 'Join your partner' : 'Account setup'}
      title={joining ? 'Join your shared financial space' : 'Create your shared financial space'}
      description="Track expenses, budget transparently, and build savings alongside your partner."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/sign-in${search}`} className="font-medium text-secondary hover:underline">
            Sign In
          </Link>
        </>
      }
    >
      {joining && invite.data && (
        <div className="flex items-center gap-space-sm rounded-base bg-partner-2-container px-space-md py-space-sm text-body-sm text-on-partner-2-container">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {invite.data.invitedByName} invited you to <strong>{invite.data.householdName}</strong>.
          </span>
        </div>
      )}
      {joining && invite.isError && (
        <FormAlert message="This invite link is invalid or has expired. Ask your partner to send a new one." />
      )}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
        <FormAlert message={formError} />
        <FormField label="Full Name" error={errors.name?.message}>
          <Input autoComplete="name" placeholder="e.g. Alex Morgan" {...form.register('name')} />
        </FormField>
        <FormField
          label="Email Address"
          error={errors.email?.message}
          hint={joining && invite.data ? `Use the invited email: ${invite.data.email}` : undefined}
          aside={<span className="text-label-sm text-on-surface-variant">Your login & alerts</span>}
        >
          <Input type="email" autoComplete="email" placeholder="alex@example.com" {...form.register('email')} />
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        >
          <PasswordInput autoComplete="new-password" placeholder="Create a strong password" {...form.register('password')} />
        </FormField>

        {!joining && (
          <>
            <FormField label="Shared Space name" error={errors.householdName?.message} hint="You can rename it later in Settings.">
              <Input placeholder="e.g. Alex & Maya" {...form.register('householdName')} />
            </FormField>
            <div className="flex flex-col gap-space-sm rounded-base bg-surface-container-low p-space-md">
              <div className="flex items-center justify-between">
                <span className="text-label-md text-on-surface">Invite your partner</span>
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant uppercase">
                  Optional
                </span>
              </div>
              <FormField
                label="Partner's Email"
                error={errors.partnerEmail?.message}
                hint="Invite your partner now, or skip and send the invitation later from Settings."
              >
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="partner@example.com"
                  className="bg-surface-container-lowest"
                  {...form.register('partnerEmail')}
                />
              </FormField>
            </div>
          </>
        )}

        <Button type="submit" size="lg" className="mt-space-sm h-12 text-label-md" disabled={pending}>
          {pending ? 'Creating account…' : joining ? 'Create Account & Join' : 'Create Account'}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </form>
    </AuthCard>
  );
}
