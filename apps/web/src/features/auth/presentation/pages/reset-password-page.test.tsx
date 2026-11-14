import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, renderRoute, requestBody } from '@/test/render';

const anonymous = () => jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401);

describe('ResetPasswordPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests a reset link and shows the neutral confirmation', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/forgot-password': () =>
        jsonResponse({ message: 'If that email is registered, a reset link is on its way.' }, 202),
    });
    renderRoute('/reset-password');
    await userEvent.type(await screen.findByLabelText('Household Member Email'), 'alex@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If that email is registered');
    expect(requestBody(fetchMock, 'POST /api/auth/forgot-password')).toEqual({ email: 'alex@example.com' });
  });

  it('with a token: validates matching passwords, then confirms', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/reset-password': () => new Response(null, { status: 204 }),
    });
    renderRoute('/reset-password?token=t0k');
    await userEvent.type(await screen.findByLabelText('New password'), 'new-password-1');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different-pw');
    await userEvent.click(screen.getByRole('button', { name: 'Set New Password' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Confirm new password'));
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Set New Password' }));
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(requestBody(fetchMock, 'POST /api/auth/reset-password')).toEqual({ token: 't0k', password: 'new-password-1' });
  });

  it('explains an invalid or expired token and offers a new link', async () => {
    mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/reset-password': () =>
        jsonResponse({ statusCode: 422, message: 'Invalid or expired reset token', error: 'INVALID_RESET_TOKEN' }, 422),
    });
    renderRoute('/reset-password?token=old');
    await userEvent.type(await screen.findByLabelText('New password'), 'new-password-1');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Set New Password' }));
    expect(await screen.findByText('This reset link is invalid or has expired.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/reset-password');
  });
});
