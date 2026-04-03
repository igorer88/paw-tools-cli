import type { ExitCode } from '@/typings/exit-codes'

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: ExitCode
  error?: Error
}

export interface Executor {
  exec(command: string): Promise<ExecResult>
  execSync(command: string): string
  spawn(command: string, args: string[]): import('node:child_process').ChildProcess
}
