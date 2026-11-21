/**
 * Opaque keyset cursor for the newest-first list: (transactionDate, createdAt, id) of the last item.
 * base64url of "YYYY-MM-DD|ISO createdAt|id". Clients pass it back untouched.
 */
export interface TransactionCursor {
  transactionDate: string;
  createdAt: Date;
  id: string;
}

export const encodeCursor = (c: TransactionCursor): string =>
  Buffer.from(`${c.transactionDate}|${c.createdAt.toISOString()}|${c.id}`, 'utf8').toString('base64url');

/** null when the cursor is malformed. */
export function decodeCursor(raw: string): TransactionCursor | null {
  const parts = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  if (parts.length !== 3) return null;
  const [transactionDate, createdAtIso, id] = parts;
  const createdAt = new Date(createdAtIso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) || Number.isNaN(createdAt.getTime()) || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return null;
  }
  return { transactionDate, createdAt, id };
}
