import { DANGEROUS_CHARS, ERROR_MESSAGES } from './constants/command-validator.constants'

import type { CommandValidatorCheck } from './interfaces/command-validator.interface'

/**
 * Validates commands and arguments for security issues
 */
export class CommandValidator implements CommandValidatorCheck {
  /**
   * Detects shell metacharacters that could enable injection
   * @throws Error if command contains dangerous patterns
   */
  validate(command: string): void {
    if (DANGEROUS_CHARS.test(command)) {
      const matches = command.match(DANGEROUS_CHARS)
      const foundChars = matches ? [...new Set(matches)].join('') : 'dangerous characters'
      throw new Error(ERROR_MESSAGES.INVALID_CHARS(foundChars))
    }
  }

  /**
   * Validates arguments for spawn operations
   * @throws Error if any argument contains dangerous characters
   */
  validateArgs(args: string[]): void {
    for (const arg of args) {
      if (arg && DANGEROUS_CHARS.test(arg)) {
        throw new Error(ERROR_MESSAGES.INVALID_ARG(arg))
      }
    }
  }
}
