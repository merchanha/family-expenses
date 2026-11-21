import { decodeCursor, encodeCursor } from './transaction-cursor';

describe('transaction cursor', () => {
  it('round-trips', () => {
    const c = { transactionDate: '2026-11-21', createdAt: new Date('2026-11-21T10:00:00.123Z'), id: 'ckabc123' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  it('rejects garbage', () => {
    expect(decodeCursor('not-a-cursor')).toBeNull();
    expect(decodeCursor(Buffer.from('2026-11-21|nope|id').toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from("2026-11-21|2026-11-21T10:00:00Z|x' OR 1=1").toString('base64url'))).toBeNull();
  });
});
