import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '@/components/error-state';
import { ApiError } from '@/lib/api';

describe('ErrorState', () => {
  it('shows the network message for status 0 and retries', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new ApiError(0, 'Failed to fetch')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Can't reach Tandem right now");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('never shows raw server text', () => {
    render(<ErrorState error={new ApiError(500, '{"stack":"boom"}')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.queryByText(/stack/)).not.toBeInTheDocument();
  });
});
