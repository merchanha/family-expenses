import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealth } from '@/hooks/use-health';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'down' | 'pending';

const TONES: Record<Tone, { dot: string; badge: string }> = {
  ok: { dot: 'bg-positive', badge: 'border-positive-border bg-positive-container text-[#047857]' },
  warn: { dot: 'bg-warning', badge: 'border-warning-border bg-warning-container text-[#b45309]' },
  down: { dot: 'bg-negative', badge: 'border-negative-border bg-negative-container text-negative' },
  pending: { dot: 'bg-outline', badge: 'border-hairline bg-surface-container-low text-on-surface-variant' },
};

/** P0 exit-criterion indicator: web ⇄ api health via GET /api/health. */
export function ApiStatus() {
  const { data, error, isPending, isFetching } = useHealth();

  let tone: Tone = 'pending';
  let label = 'Checking…';
  let detail = 'Contacting /api/health';
  if (data) {
    const dbUp = data.db === 'up';
    tone = data.status === 'ok' && dbUp ? 'ok' : 'warn';
    label = tone === 'ok' ? 'Online' : 'Degraded';
    detail = `API ${data.status} · database ${data.db}`;
  } else if (error) {
    tone = 'down';
    label = 'Offline';
    detail = error.message || 'API unreachable';
  }

  return (
    <Card className="gap-space-sm py-space-lg" data-testid="api-status">
      <CardHeader className="px-space-lg">
        <CardTitle className="text-label-sm uppercase text-on-surface-variant">API status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-space-sm px-space-lg">
        <div className="flex items-center gap-space-sm">
          <span className={cn('size-2.5 rounded-full', TONES[tone].dot, isFetching && 'animate-pulse')} aria-hidden="true" />
          <span className="text-body-md text-on-surface">{detail}</span>
        </div>
        <div className="flex items-center gap-space-sm">
          {data && (
            <span className="tabular text-body-sm text-on-surface-variant">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          <Badge variant="outline" className={TONES[tone].badge} aria-live="polite">
            {isPending && !error ? 'Checking…' : label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
