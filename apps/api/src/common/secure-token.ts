import { createHash, randomBytes } from 'crypto';

/** Opaque, URL-safe random token (256 bits). Sent to the client once; never stored raw. */
export const generateOpaqueToken = (): string => randomBytes(32).toString('base64url');

/** sha256 hex digest used to store and look up opaque tokens. */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
