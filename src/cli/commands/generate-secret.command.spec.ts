import { GenerateSecretCommand } from './generate-secret.command'

const mockConsoleService = {
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

jest.mock('@/shared/console', () => ({
  ConsoleService: jest.fn().mockImplementation(() => mockConsoleService)
}))

describe('GenerateSecretCommand', () => {
  let command: GenerateSecretCommand

  beforeEach(() => {
    command = new GenerateSecretCommand()
    mockConsoleService.success.mockClear()
  })

  it('should be defined', () => {
    expect(command).toBeDefined()
  })

  it('should generate 32-byte hex string (64 characters)', async () => {
    await command.run()

    expect(mockConsoleService.success).toHaveBeenCalledTimes(1)
    const secretKey = mockConsoleService.success.mock.calls[0][0]
    expect(secretKey).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should generate unique keys on each run', async () => {
    const keys = new Set<string>()

    for (let i = 0; i < 10; i++) {
      mockConsoleService.success.mockClear()
      await command.run()
      const key = mockConsoleService.success.mock.calls[0][0]
      keys.add(key)
    }

    expect(keys.size).toBe(10)
  })
})
