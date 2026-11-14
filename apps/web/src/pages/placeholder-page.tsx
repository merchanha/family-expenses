import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlaceholderPage({
  title,
  milestone,
  children,
}: {
  title: string;
  milestone: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-space-lg">
      {children}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-headline-md">{title}</CardTitle>
          <CardDescription>Coming in {milestone}. This is a placeholder page in the P0 app shell.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 rounded-base border border-dashed border-outline-variant bg-surface-container-low" />
        </CardContent>
      </Card>
    </div>
  );
}
