import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ApiErrorCode, forgotPasswordSchema, PASSWORD_MIN_LENGTH, passwordSchema, z, type ForgotPasswordInput } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { useRequestPasswordReset } from '@/features/auth/application/use-request-password-reset';
import { useResetPassword } from '@/features/auth/application/use-reset-password';
import { AuthCard } from '@/features/auth/presentation/components/auth-card';

const TOO_MANY = { 429: 'Too many attempts. Wait a minute and try again.' };

function BackToSignIn() {
  return (
    <Link to="/sign-in" className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-on-surface">
      <ArrowLeft className="size-4" aria-hidden="true" />
      Return to Sign In
    </Link>
  );
}

function RequestResetForm() {
  const request = useRequestPasswordReset();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await request.mutateAsync(values);
      setSentMessage(res.message);
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['email'], TOO_MANY));
    }
  });

  return (
    <AuthCard
      eyebrow="Identity verification"
      title="Reset your password"
      description="Enter your registered email address and we'll send you a secure, time-limited link to choose a new password."
    >
      {sentMessage ? (
        <FormAlert tone="success" message={`${sentMessage} Check your inbox (and spam folder).`} />
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
          <FormAlert message={formError} />
          <FormField label="Household Member Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} />
          </FormField>
          <Button type="submit" size="lg" className="h-12 text-label-md" disabled={isSubmitting || request.isPending}>
            {request.isPending ? 'Sending…' : 'Send Reset Link'}
            {!request.isPending && <ArrowRight aria-hidden="true" />}
          </Button>
        </form>
      )}
      <BackToSignIn />
    </AuthCard>
  );
}

const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

function ChooseNewPasswordForm({ token }: { token: string }) {
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const form = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await reset.mutateAsync({ token, password });
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.INVALID_RESET_TOKEN) {
        setInvalidLink(true);
        return;
      }
      setFormError(applyServerErrors(err, form.setError, ['password'], TOO_MANY));
    }
  });

  if (reset.isSuccess) {
    return (
      <AuthCard title="Password updated" description="Your password was changed and your other sessions were signed out.">
        <Button asChild size="lg" className="h-12 text-label-md">
          <Link to="/sign-in">
            Sign In <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Identity verification" title="Choose a new password" description="Pick a new password for your Tandem account.">
      {invalidLink ? (
        <div className="flex flex-col gap-space-md">
          <FormAlert message="This reset link is invalid or has expired." />
          <Button asChild variant="secondary" size="lg">
            <Link to="/reset-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
          <FormAlert message={formError} />
          <FormField label="New password" error={errors.password?.message} hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}>
            <PasswordInput autoComplete="new-password" {...form.register('password')} />
          </FormField>
          <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
          </FormField>
          <Button type="submit" size="lg" className="h-12 text-label-md" disabled={isSubmitting || reset.isPending}>
            {reset.isPending ? 'Saving…' : 'Set New Password'}
          </Button>
        </form>
      )}
      <BackToSignIn />
    </AuthCard>
  );
}

/** /reset-password (request a link) and /reset-password?token=… (choose a new password). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return token ? <ChooseNewPasswordForm token={token} /> : <RequestResetForm />;
}
