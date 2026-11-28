import { useSearchParams } from 'react-router-dom';
import { progressWindowSchema, type ProgressWindow } from '@tandem/shared';

/** Trend window in `?window=MOM|3M|6M` (default MOM, kept out of the URL). */
export function useProgressWindow(): [ProgressWindow, (next: ProgressWindow) => void] {
  const [params, setParams] = useSearchParams();
  const parsed = progressWindowSchema.safeParse(params.get('window'));
  const set = (next: ProgressWindow) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'MOM') p.delete('window');
        else p.set('window', next);
        return p;
      },
      { replace: true },
    );
  return [parsed.success ? parsed.data : 'MOM', set];
}
