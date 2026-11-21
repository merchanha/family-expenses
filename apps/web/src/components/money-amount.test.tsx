import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyAmount } from '@/components/money-amount';

const text = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ');

describe('MoneyAmount', () => {
  it('shows expenses with a minus sign and the negative tone', () => {
    render(<MoneyAmount amount="1234.50" type="EXPENSE" />);
    const el = screen.getByText(/1\.234,50/);
    expect(text(el)).toBe('−$ 1.234,50');
    expect(el).toHaveClass('text-danger-text', 'tabular');
  });

  it('shows income with a plus sign and the positive tone', () => {
    render(<MoneyAmount amount="10" type="INCOME" />);
    const el = screen.getByText(/10,00/);
    expect(text(el)).toBe('+$ 10,00');
    expect(el).toHaveClass('text-positive-text');
  });

  it('shows neutral totals without sign or tone', () => {
    render(<MoneyAmount amount="0" />);
    const el = screen.getByText(/0,00/);
    expect(text(el)).toBe('$ 0,00');
    expect(el).not.toHaveClass('text-positive-text');
    expect(el).not.toHaveClass('text-danger-text');
  });
});
