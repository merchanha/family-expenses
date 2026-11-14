import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  currencyCodeSchema,
  householdNameSchema,
  splitPercentSchema,
  z,
  type CurrentHouseholdResponse,
  type UpdateHouseholdInput,
} from '@tandem/shared';
import { FormAlert } from '@/components/form-alert';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyServerErrors } from '@/lib/form-errors';
import { useUpdateHousehold } from '@/features/households/application/use-update-household';
import { memberBySlot, memberLabel, splitLabel } from '@/features/households/domain/member-display';
import { SettingsSection } from '@/features/households/presentation/components/settings/settings-section';

// Same field schemas as the API's updateHouseholdSchema; all three are edited together here.
const householdFormSchema = z.object({
  name: householdNameSchema,
  defaultCurrency: currencyCodeSchema,
  defaultSplitPartner1Percent: splitPercentSchema,
});
type HouseholdFormInput = z.input<typeof householdFormSchema>;
type HouseholdFormOutput = z.output<typeof householdFormSchema>;
const FIELDS = ['name', 'defaultCurrency', 'defaultSplitPartner1Percent'] as const;

export function HouseholdSection({ data }: { data: CurrentHouseholdResponse }) {
  const { household } = data;
  const update = useUpdateHousehold();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const form = useForm<HouseholdFormInput, unknown, HouseholdFormOutput>({
    resolver: zodResolver(householdFormSchema),
    values: {
      name: household.name,
      defaultCurrency: household.defaultCurrency,
      defaultSplitPartner1Percent: household.defaultSplitPartner1Percent,
    },
  });
  const { errors, isDirty, dirtyFields } = form.formState;
  const p1 = form.watch('defaultSplitPartner1Percent');
  const p1Valid = splitPercentSchema.safeParse(p1).success;
  const partner1 = memberBySlot(data, 'PARTNER_1');
  const partner2 = memberBySlot(data, 'PARTNER_2');

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null);
    // Send only what changed (PATCH).
    const patch: UpdateHouseholdInput = {};
    if (dirtyFields.name) patch.name = values.name;
    if (dirtyFields.defaultCurrency) patch.defaultCurrency = values.defaultCurrency;
    if (dirtyFields.defaultSplitPartner1Percent) patch.defaultSplitPartner1Percent = values.defaultSplitPartner1Percent;
    try {
      await update.mutateAsync(patch);
      setMessage({ tone: 'success', text: 'Shared Space settings saved.' });
    } catch (err) {
      const text = applyServerErrors(err, form.setError, FIELDS);
      if (text) setMessage({ tone: 'error', text });
    }
  });

  return (
    <SettingsSection title="Shared Space" description="Settings both partners share. Either partner can change them.">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-space-md">
        {message && <FormAlert tone={message.tone} message={message.text} />}
        <FormField label="Shared Space name" error={errors.name?.message}>
          <Input {...form.register('name')} />
        </FormField>
        <FormField label="Default currency" error={errors.defaultCurrency?.message} hint="3-letter code, e.g. ARS.">
          <Input className="w-32 uppercase" maxLength={3} autoComplete="off" {...form.register('defaultCurrency')} />
        </FormField>
        <FormField
          label={`Default split — ${partner1 ? memberLabel(partner1) : 'Partner 1'} share (%)`}
          error={errors.defaultSplitPartner1Percent?.message}
          hint={
            p1Valid
              ? `${splitLabel(Number(p1))}: ${partner2 ? memberLabel(partner2) : 'Partner 2'} covers ${100 - Number(p1)}%. Used for display and planning only.`
              : 'Between 1 and 99. Used for display and planning only.'
          }
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            step={1}
            className="w-32 tabular"
            {...form.register('defaultSplitPartner1Percent', { valueAsNumber: true })}
          />
        </FormField>
        <div>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save Shared Space'}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
