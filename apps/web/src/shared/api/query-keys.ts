export const queryKeys = {
  session: ['session'] as const,
  setup: ['setup'] as const,
  bank: (bankId: string) => ['bank', bankId] as const,
  records: (bankId: string) => ['study', bankId] as const,
};
