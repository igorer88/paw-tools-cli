import { GenerateSecretCommand } from './generate-secret.command'

describe('GenerateSecretCommand', () => {
  let command: GenerateSecretCommand
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    command = new GenerateSecretCommand()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('should be defined', () => {
    expect(command).toBeDefined()
  })

  it('should generate 32-byte hex string (64 characters)', async () => {
    await command.run()

    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const secretKey = consoleSpy.mock.calls[0][0]
    expect(secretKey).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should generate unique keys on each run', async () => {
    const keys = new Set<string>()

    for (let i = 0; i < 10; i++) {
      consoleSpy.mockClear()
      await command.run()
      const key = consoleSpy.mock.calls[0][0]
      keys.add(key)
    }

    expect(keys.size).toBe(10)
  })
})
