export const ExitCodes = {
  SUCCESS: 0,
  ERROR: 1
} as const

export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes]
