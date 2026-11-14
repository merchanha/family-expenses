import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { ApiErrorCode, loginSchema, type LoginInput } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { useSignIn } from '@/features/auth/application/use-sign-in';
import { AuthCard } from '@/features/auth/presentation/components/auth-card';

export function SignInPage() {
  const [params] = useSearchParams();
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn.mutateAsync(values);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.code === ApiErrorCode.INVALID_CREDENTIALS)) {
        setFormError('Email or password is incorrect.');
        form.resetField('password');
        return;
      }
      setFormError(
        applyServerErrors(err, form.setError, ['email', 'password'], {
          429: 'Too many sign-in attempts. Wait a minute and try again.',
        }),
      );
    }
  });

  const search = params.toString() ? `?${params.toString()}` : '';
  const pending = isSubmitting || signIn.isPending;

  return (
    <AuthCard
      showTabs
      title="Welcome back to Tandem"
      description="Continue managing your shared financial journey together."
      footer={
        <>
          Partner hasn&apos;t joined yet?{' '}
          <Link to={`/create-account${search}`} className="font-medium text-secondary hover:underline">
            Create your Shared Space
          </Link>
          .
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
        <FormAlert message={formError} />
        <FormField label="Household Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} />
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          aside={
            <Link to="/reset-password" className="text-label-sm text-secondary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" placeholder="Enter your password" {...form.register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-space-sm h-12 text-label-md" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign In to Household'}
          {!pending && <ArrowRight aria-hidden="true" />}
        </Button>
      </form>
      <p className="flex items-center justify-center gap-1.5 text-body-sm text-on-surface-variant">
        <Mail className="size-4" aria-hidden="true" />
        Each partner signs in with their own email.
      </p>
    </AuthCard>
  );
}
