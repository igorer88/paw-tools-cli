import { type ChildProcess, exec as execCallback, execSync, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { Injectable } from '@nestjs/common'

import type { ExecResult, Executor } from './interfaces'

const execAsync = promisify(execCallback)

@Injectable()
export class ProcessService implements Executor {
  async exec(command: string): Promise<ExecResult> {
    try {
      const { stdout, stderr } = await execAsync(command)
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      }
    } catch (error) {
      const err = error as Error & { code?: string; killed?: boolean }
      return {
        stdout: '',
        stderr: err.message || String(error),
        exitCode: 1,
        error: err
      }
    }
  }

  execSync(command: string): string {
    return execSync(command, { encoding: 'utf-8' }).trim()
  }

  spawn(command: string, args: string[]): ChildProcess {
    return spawn(command, args, {
      stdio: 'inherit',
      shell: true
    })
  }
}
