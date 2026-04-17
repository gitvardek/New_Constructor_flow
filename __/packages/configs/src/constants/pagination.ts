export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  limitOptions: [20, 50, 100] as const,
} as const

export type LimitOption = (typeof PAGINATION.limitOptions)[number]
