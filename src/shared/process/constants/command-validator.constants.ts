/**
 * Characters that indicate potential command injection attempts
 */
export const DANGEROUS_CHARS = /[;&|`$(){}[\]<>\\|]/

/**
 * Command validation error messages
 */
export const ERROR_MESSAGES = {
  INVALID_CHARS: (chars: string) =>
    `Command contains potentially dangerous shell characters (${chars}). ` +
    'This could indicate a command injection attempt. ' +
    'Use spawn() with separate args for safer execution.',
  INVALID_ARG: (arg: string) => `Argument contains dangerous shell characters: ${arg}`
} as const
