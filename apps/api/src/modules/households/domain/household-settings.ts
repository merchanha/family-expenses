/** Household tunables from env, provided by HouseholdsModule. */
export class HouseholdSettings {
  constructor(
    readonly inviteTtlDays: number,
    readonly webAppUrl: string,
  ) {}
}
