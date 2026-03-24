export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
  error?: Error
}

export interface Executor {
  exec(command: string): Promise<ExecResult>
  execSync(command: string): string
  spawn(command: string, args: string[]): import('node:child_process').ChildProcess
}
