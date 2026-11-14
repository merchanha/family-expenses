import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { routes } from '@/app/routes';
import { SessionProvider } from '@/lib/auth/session-provider';

/** Render the real route tree (with session bootstrap) at `path`. */
export function renderRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Handler = (init: RequestInit | undefined) => Response | Promise<Response>;

/**
 * Stub `fetch` with handlers keyed by "METHOD /api/path" (query string ignored).
 * Unmatched requests get a 404 so tests fail loudly. Returns the mock for assertions.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url.split('?')[0]}`;
    const handler = handlers[key];
    if (!handler) return jsonResponse({ statusCode: 404, message: `No mock for ${key}` }, 404);
    return handler(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Body of the n-th call to `key` ("METHOD /api/path"). */
export function requestBody(fetchMock: ReturnType<typeof mockApi>, key: string, n = 0): unknown {
  const calls = fetchMock.mock.calls.filter(([input, init]) => {
    const url = typeof input === 'string' ? input : String(input);
    return `${(init?.method ?? 'GET').toUpperCase()} ${url.split('?')[0]}` === key;
  });
  const body = calls[n]?.[1]?.body;
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}
