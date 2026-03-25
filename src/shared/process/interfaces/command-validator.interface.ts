/**
 * Interface for command validation
 * Follows Interface Segregation Principle (ISP) - small, focused interface
 */
export interface CommandValidatorCheck {
  validate(command: string): void
  validateArgs(args: string[]): void
}
