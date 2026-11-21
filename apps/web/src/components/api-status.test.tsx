import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiStatus } from '@/components/api-status';
import { jsonResponse, mockApi } from '@/test/render';

// Moved from app-layout.test.tsx when the P0 dashboard placeholder (which hosted it) was replaced in P2.
function renderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

describe('ApiStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows API status as online when /api/health reports db up', async () => {
    mockApi({ 'GET /api/health': () => jsonResponse({ status: 'ok', db: 'up', timestamp: new Date().toISOString() }) });
    renderStatus();
    expect(await screen.findByText('Online')).toBeInTheDocument();
  });

  it('shows Degraded when the API returns 503 {status: error, db: down}', async () => {
    mockApi({
      'GET /api/health': () => jsonResponse({ status: 'error', db: 'down', timestamp: new Date().toISOString() }, 503),
    });
    renderStatus();
    expect(await screen.findByText('Degraded')).toBeInTheDocument();
  });
});
