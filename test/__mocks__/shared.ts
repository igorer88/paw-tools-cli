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

// Mock ProcessService
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
