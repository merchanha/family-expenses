/** Auth tunables from env (src/config/env.ts), provided by AuthModule. Plain values → easy to fake. */
export class AuthSettings {
  constructor(
    readonly refreshTokenTtlDays: number,
    readonly passwordResetTtlMinutes: number,
    readonly webAppUrl: string,
  ) {}
}
