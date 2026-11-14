export const householdKeys = {
  all: ['households'] as const,
  current: () => [...householdKeys.all, 'me'] as const,
  invitePreview: (token: string) => [...householdKeys.all, 'invite-preview', token] as const,
};
