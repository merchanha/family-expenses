import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { displayNameSchema, updateProfileSchema, z, type HouseholdMember, type UpdateProfileInput } from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthenticatedSession } from '@/lib/auth/session-context';
import { applyServerErrors } from '@/lib/form-errors';
import { useUpdateMyMember } from '@/features/households/application/use-update-my-member';
import { useUpdateProfile } from '@/features/households/application/use-update-profile';
import { SettingsSection } from '@/features/households/presentation/components/settings/settings-section';

function NameForm() {
  const { user } = useAuthenticatedSession();
  const update = useUpdateProfile();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema), values: { name: user.name } });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null);
    try {
      await update.mutateAsync(values);
      setMessage({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      const text = applyServerErrors(err, form.setError, ['name']);
      if (text) setMessage({ tone: 'error', text });
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
      {message && <FormAlert tone={message.tone} message={message.text} />}
      <FormField label="Full name" error={errors.name?.message}>
        <Input autoComplete="name" {...form.register('name')} />
      </FormField>
      <FormField label="Email" hint="Your sign-in email can't be changed yet.">
        <Input type="email" value={user.email} readOnly disabled />
      </FormField>
      <div>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
}

const displayNameFormSchema = z.object({ displayName: z.union([z.literal(''), displayNameSchema]) });
type DisplayNameForm = z.infer<typeof displayNameFormSchema>;

function DisplayNameForm({ member }: { member: HouseholdMember }) {
  const update = useUpdateMyMember();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const form = useForm<DisplayNameForm>({
    resolver: zodResolver(displayNameFormSchema),
    values: { displayName: member.displayName ?? '' },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async ({ displayName }) => {
    setMessage(null);
    try {
      await update.mutateAsync({ displayName: displayName.trim() || null });
      setMessage({ tone: 'success', text: 'Display name saved.' });
    } catch (err) {
      const text = applyServerErrors(err, form.setError, ['displayName']);
      if (text) setMessage({ tone: 'error', text });
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md border-t border-hairline pt-space-md">
      {message && <FormAlert tone={message.tone} message={message.text} />}
      <FormField
        label="Display name in the Shared Space"
        error={errors.displayName?.message}
        hint="Shown on partner chips and filters. Leave empty to use your full name."
      >
        <Input placeholder={member.name} {...form.register('displayName')} />
      </FormField>
      <div>
        <Button type="submit" variant="secondary" disabled={!isDirty || update.isPending}>
          {update.isPending ? 'Saving…' : 'Save display name'}
        </Button>
      </div>
    </form>
  );
}

export function ProfileSection({ me }: { me: HouseholdMember | undefined }) {
  return (
    <SettingsSection title="Profile" description="Your personal account details.">
      <NameForm />
      {me && <DisplayNameForm member={me} />}
    </SettingsSection>
  );
}
