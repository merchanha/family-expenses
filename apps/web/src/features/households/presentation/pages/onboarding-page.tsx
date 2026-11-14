import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { createHouseholdSchema, z } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthenticatedSession, useSession } from '@/lib/auth/session-context';
import { applyServerErrors } from '@/lib/form-errors';
import { useCreateHousehold } from '@/features/households/application/use-create-household';

const onboardingSchema = createHouseholdSchema.pick({ name: true });
type OnboardingForm = z.infer<typeof onboardingSchema>;

/** Signed in without a Shared Space: create one, or join through the partner's invite link. */
export function OnboardingPage() {
  const { user } = useAuthenticatedSession();
  const { signOut } = useSession();
  const create = useCreateHousehold();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<OnboardingForm>({ resolver: zodResolver(onboardingSchema), defaultValues: { name: '' } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      // On success the session gets a household and RequireNoHousehold sends the user to the dashboard.
      await create.mutateAsync(values);
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['name']));
    }
  });

  return (
    <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-level-2">
      <div className="h-1 bg-linear-to-r from-partner-1 to-partner-2" aria-hidden="true" />
      <div className="flex flex-col gap-space-lg p-space-lg md:p-space-xl">
        <header className="flex flex-col gap-space-sm">
          <h1 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Create a Shared Space for your household. You can invite your partner right after.
          </p>
        </header>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
          <FormAlert message={formError} />
          <FormField label="Shared Space name" error={errors.name?.message}>
            <Input placeholder="e.g. Alex & Maya" {...form.register('name')} />
          </FormField>
          <Button type="submit" size="lg" className="h-12 text-label-md" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Shared Space'}
            {!create.isPending && <ArrowRight aria-hidden="true" />}
          </Button>
        </form>
        <div className="rounded-base bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface-variant">
          Joining your partner instead? Open the invitation link from their email while signed in as{' '}
          <span className="font-medium text-on-surface">{user.email}</span>.
        </div>
        <Button variant="ghost" className="self-start" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
