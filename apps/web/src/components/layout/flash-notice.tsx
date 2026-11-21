import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { clearFlashNotice, peekFlashNotice } from '@/lib/flash-notice';

/** Non-blocking, dismissible notice shown once on the first app page after a flow (FOR-97). */
export function FlashNotice() {
  const [message, setMessage] = useState(peekFlashNotice);
  useEffect(() => {
    if (message) clearFlashNotice();
  }, [message]);
  if (!message) return null;
  return (
    <Alert role="status" className="mb-space-lg pr-12">
      <Info aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss notice"
        className="absolute top-2 right-2"
        onClick={() => setMessage(null)}
      >
        <X />
      </Button>
    </Alert>
  );
}
