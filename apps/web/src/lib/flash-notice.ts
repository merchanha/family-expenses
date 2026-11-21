/**
 * One-shot notice carried across a navigation the page doesn't control (e.g. the
 * session guard redirecting after sign-up). In memory only: the SPA doesn't reload.
 */
let pending: string | null = null;

export function setFlashNotice(message: string): void {
  pending = message;
}

export function peekFlashNotice(): string | null {
  return pending;
}

export function clearFlashNotice(): void {
  pending = null;
}
