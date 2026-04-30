// Mock ConsoleService
export const mockConsoleService = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  start: jest.fn(),
  done: jest.fn(),
  fail: jest.fn(),
  log: jest.fn()
}

// Mock FileHandlerService
export const mockFileHandler = {
  exists: jest.fn().mockReturnValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  readJson: jest.fn().mockResolvedValue({}),
  writeFile: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined),
  ensureDir: jest.fn().mockResolvedValue(undefined)
}

// Mock ProcessService with version support for DependencyService tests
export class MockProcessService {
  private versionMap: Map<string, string> = new Map()
  private existsMap: Map<string, boolean> = new Map()

  setVersion(command: string, version: string): void {
    this.versionMap.set(command, version)
    this.existsMap.set(command, true)
  }

  setNotFound(command: string): void {
    this.existsMap.set(command, false)
  }

  which(command: string): string | null {
    return this.existsMap.get(command) ? `/usr/bin/${command}` : null
  }

  async getVersion(command: string): Promise<string> {
    return this.versionMap.get(command) || ''
  }

  exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
  execSync = jest.fn().mockReturnValue('')
  spawn = jest.fn()
}

// Keep the old mock for backwards compatibility
export const mockProcessService = {
  exec: jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  execSync: jest.fn().mockReturnValue(''),
  spawn: jest.fn()
}

// Mock PromptService
export const mockPromptService = {
  text: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(),
  spinnerMessage: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }))
}
