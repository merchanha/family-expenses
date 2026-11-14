/**
 * Only allow same-app relative paths as post-sign-in redirects (no open redirects
 * to other origins, no protocol-relative `//host`, no bouncing back to auth pages).
 */
export function safeRedirect(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
  const pathname = target.split(/[?#]/)[0]!;
  if (['/sign-in', '/create-account', '/reset-password'].includes(pathname)) return fallback;
  return target;
}
