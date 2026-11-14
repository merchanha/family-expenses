import { Prisma } from '@prisma/client';

/** Convert a validated decimal string from the wire into a Prisma Decimal. Never use Number(). */
export const toDecimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

/** Serialize a Decimal for the wire as a fixed 2-decimal string. */
export const fromDecimal = (value: Prisma.Decimal): string => value.toFixed(2);
