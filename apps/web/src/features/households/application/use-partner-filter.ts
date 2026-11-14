import { useSearchParams } from 'react-router-dom';
import { partnerSlotSchema, type PartnerSlot } from '@tandem/shared';

/** Current `?partner=` value (filters on "paid by"); `null` = All Shared. */
export function usePartnerFilter(): [PartnerSlot | null, (slot: PartnerSlot | null) => void] {
  const [params, setParams] = useSearchParams();
  const parsed = partnerSlotSchema.safeParse(params.get('partner'));
  const set = (slot: PartnerSlot | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (slot) next.set('partner', slot);
        else next.delete('partner');
        return next;
      },
      { replace: true },
    );
  return [parsed.success ? parsed.data : null, set];
}
