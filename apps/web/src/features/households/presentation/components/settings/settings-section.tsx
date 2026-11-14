import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="gap-space-md">
      <CardHeader>
        <CardTitle className="font-headline text-headline-sm text-on-surface">
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription className="text-body-sm text-on-surface-variant">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-space-md">{children}</CardContent>
    </Card>
  );
}
