import {
  type ChildProcess,
  exec as execCallback,
  execSync,
  type SpawnOptions,
  spawn
} from 'node:child_process'
import { platform } from 'node:os'
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
   * @param options - Additional spawn options
   */
  spawn(command: string, args: string[], options: SpawnOptions = {}): ChildProcess {
    this.validator.validateArgs(args)
    // No shell: true - arguments are passed directly to the process
    // This prevents shell injection attacks
    return spawn(command, args, {
      stdio: 'inherit',
      ...options
    })
  }

  /**
   * Find the full path of a command using which/where
   * @param command - Command name to locate
   * @returns Full path or null if not found
   */
  which(command: string): string | null {
    this.validator.validate(command)
    try {
      const cmd = platform() === 'win32' ? 'where' : 'which'
      const result = execSync(`${cmd} ${command}`, { encoding: 'utf-8' }).trim()
      return result.split('\n')[0]
    } catch {
      return null
    }
  }

  /**
   * Get version of an installed command
   * @param command - Command name
   * @param args - Version args (default: ['--version'])
   */
  async getVersion(command: string, args = ['--version']): Promise<string | null> {
    this.validator.validateArgs(args)
    try {
      const result = await execAsync(`${command} ${args.join(' ')}`)
      const output = (result.stdout || result.stderr).trim()
      // Extract first semver-like pattern (e.g., 2.50.1, v2.50.1)
      const match = output.match(/(\d+\.\d+\.\d+(?:\.\d+)?)/)
      return match ? match[1] : null
    } catch {
      return null
    }
  }
}
