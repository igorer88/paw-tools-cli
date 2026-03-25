import { type ChildProcess, exec as execCallback, execSync, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { Injectable } from '@nestjs/common'

import { ExitCodes } from '@/shared/exit-codes'
import { CommandValidator } from './command.validator'
import type { ExecResult, Executor } from './interfaces'
import type { CommandValidatorCheck } from './interfaces/command-validator.interface'

const execAsync = promisify(execCallback)

@Injectable()
export class ProcessService implements Executor {
  private readonly validator: CommandValidatorCheck

  constructor() {
    this.validator = new CommandValidator()
  }

  /**
   * Execute a command asynchronously (for commands that return output)
   * @throws Error if command contains dangerous shell metacharacters
   */
  async exec(command: string): Promise<ExecResult> {
    try {
      this.validator.validate(command)
      const { stdout, stderr } = await execAsync(command)
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: ExitCodes.SUCCESS
      }
    } catch (error) {
      const err = error as Error & { code?: string; killed?: boolean }
      return {
        stdout: '',
        stderr: err.message || String(error),
        exitCode: ExitCodes.ERROR,
        error: err
      }
    }
  }

  /**
   * Execute a command synchronously
   * @throws Error if command contains dangerous shell metacharacters
   */
  execSync(command: string): string {
    this.validator.validate(command)
    return execSync(command, { encoding: 'utf-8' }).trim()
  }

  /**
   * Spawn a child process with separate command and arguments
   * This is the safest method as it avoids shell interpretation
   * @param command - The executable to run
   * @param args - Array of arguments (will be properly escaped)
   */
  spawn(command: string, args: string[]): ChildProcess {
    this.validator.validateArgs(args)
    // No shell: true - arguments are passed directly to the process
    // This prevents shell injection attacks
    return spawn(command, args, {
      stdio: 'inherit'
    })
  }
}
