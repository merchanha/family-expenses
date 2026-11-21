/**
 * Envelope display rules (PO decisions #18/#19). Labels and date math only — every money and
 * percentage figure comes from the API.
 */

/** "60/40" for an envelope's own split, "Default (50/50)" when it follows the household default. */
export function envelopeSplitLabel(splitPartner1Percent: number | null, defaultPartner1Percent: number): string {
  if (splitPartner1Percent === null) return `Default (${defaultPartner1Percent}/${100 - defaultPartner1Percent})`;
  return `${splitPartner1Percent}/${100 - splitPartner1Percent}`;
}

/**
 * Days left in the period, counting today, as a calendar-date calculation (`YYYY-MM-DD` strings).
 * Returns null when today is outside [from, to] (past or future month).
 */
export function daysLeftInPeriod(period: { from: string; to: string }, today: string): number | null {
  if (today < period.from || today > period.to) return null;
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(period.to) - toUtc(today)) / 86_400_000) + 1;
}

/** True when an API money string is negative ("-50.00"). */
export function isNegativeAmount(amount: string): boolean {
  return amount.trim().startsWith('-');
}

/** "-50.00" → "50.00", for "over by" copy. String-only; no arithmetic. */
export function absAmount(amount: string): string {
  return amount.trim().replace(/^-/, '');
}
