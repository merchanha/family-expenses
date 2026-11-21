import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PartnerChip } from '@/components/partner-chip';

describe('PartnerChip', () => {
  it('shows the partner name in that partner’s tokens', () => {
    render(<PartnerChip person={{ name: 'Maya', partnerSlot: 'PARTNER_2' }} role="Paid by" />);
    const chip = screen.getByText('Maya').parentElement!;
    expect(chip).toHaveClass('bg-partner-2-container');
    expect(chip).toHaveTextContent('Paid by: Maya');
  });

  it('shows "Shared" when nobody is attributed', () => {
    render(<PartnerChip person={null} />);
    expect(screen.getByText('Shared').parentElement).not.toHaveClass('bg-partner-1-container');
  });
});
