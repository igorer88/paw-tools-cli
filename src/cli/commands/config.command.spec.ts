// biome-ignore-all lint/complexity/useLiteralKeys: bracket notation required for private access

import type { Testable } from '@/typings/tests'

import { ConfigCommand } from './config.command'

const mockFileHandler = {
  exists: jest.fn().mockReturnValue(true),
  readJson: jest.fn().mockResolvedValue({ app: { debug: true } })
}

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

jest.mock('node:fs')
jest.mock('@/shared/file-handler', () => ({
  FileHandlerService: jest.fn().mockImplementation(() => mockFileHandler)
}))
jest.mock('@/shared/console', () => ({
  ConsoleService: jest.fn().mockImplementation(() => mockConsoleService)
}))

describe('ConfigCommand', () => {
  let command: ConfigCommand
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.PAW_CONFIG
    mockFileHandler.exists.mockReturnValue(true)
    mockFileHandler.readJson.mockResolvedValue({ app: { debug: true } })
    mockConsoleService.success.mockClear()
    command = new ConfigCommand()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('resolveConfigPath', () => {
    it('should return custom path when provided', () => {
      const result = (command as Testable<ConfigCommand>)['resolveConfigPath'](
        '/custom/config.json'
      )
      expect(result).toBe('/custom/config.json')
    })

    it('should return PAW_CONFIG env var when set', () => {
      process.env.PAW_CONFIG = '/env/config.json'
      const result = (command as Testable<ConfigCommand>)['resolveConfigPath']()
      expect(result).toBe('/env/config.json')
    })

    it('should return default path when no custom path or env var', () => {
      const result = (command as Testable<ConfigCommand>)['resolveConfigPath']()
      expect(result).toContain('config')
      expect(result).toContain('config.json')
      expect(result).not.toContain('.paw-tools')
    })

    it('should prioritize custom path over env var', () => {
      process.env.PAW_CONFIG = '/env/config.json'
      const result = (command as Testable<ConfigCommand>)['resolveConfigPath'](
        '/custom/config.json'
      )
      expect(result).toBe('/custom/config.json')
    })
  })

  describe('loadConfig', () => {
    it('should load valid JSON config', async () => {
      const mockConfig = { app: { debug: true } }
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue(mockConfig)

      const result = await (command as Testable<ConfigCommand>)['loadConfig']('/test/config.json')

      expect(result).toEqual(mockConfig)
    })

    it('should throw error when file does not exist', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      await expect(
        (command as Testable<ConfigCommand>)['loadConfig']('/missing/config.json')
      ).rejects.toThrow('Config file not found: /missing/config.json')
    })
  })

  describe('validateConfig', () => {
    it('should accept valid config object', () => {
      const config = { app: { debug: true } }

      expect(() => (command as Testable<ConfigCommand>)['validateConfig'](config)).not.toThrow()
    })

    it('should throw error for null config', () => {
      expect(() => (command as Testable<ConfigCommand>)['validateConfig'](null)).toThrow(
        'Config must be a valid JSON object'
      )
    })

    it('should throw error for non-object config', () => {
      expect(() =>
        (command as Testable<ConfigCommand>)['validateConfig'](
          'string' as unknown as Record<string, unknown>
        )
      ).toThrow('Config must be a valid JSON object')
    })
  })

  describe('parseConfig', () => {
    it('should return the provided value', () => {
      const result = command.parseConfig('/custom/path.json')
      expect(result).toBe('/custom/path.json')
    })
  })

  describe('run', () => {
    it('should output success message', async () => {
      await command.run([])

      expect(mockConsoleService.success).toHaveBeenCalledWith(
        expect.stringContaining('Configuration loaded successfully')
      )
    })

    it('should use custom path from option', async () => {
      await command.run([], { config: '/custom/path.json' })

      expect(mockFileHandler.exists).toHaveBeenCalledWith('/custom/path.json')
      expect(mockFileHandler.readJson).toHaveBeenCalledWith('/custom/path.json')
    })

    it('should use PAW_CONFIG env var when no option provided', async () => {
      process.env.PAW_CONFIG = '/env/config.json'
      await command.run([])

      expect(mockFileHandler.exists).toHaveBeenCalledWith('/env/config.json')
      expect(mockFileHandler.readJson).toHaveBeenCalledWith('/env/config.json')
    })

    it('should prioritize option over PAW_CONFIG env var', async () => {
      process.env.PAW_CONFIG = '/env/config.json'
      await command.run([], { config: '/custom/path.json' })

      expect(mockFileHandler.exists).toHaveBeenCalledWith('/custom/path.json')
      expect(mockFileHandler.exists).not.toHaveBeenCalledWith('/env/config.json')
    })

    it('should throw when config file does not exist', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      await expect(command.run([])).rejects.toThrow('Config file not found')
    })

    it('should throw when config read fails', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockRejectedValue(new Error('Read error'))

      await expect(command.run([])).rejects.toThrow('Read error')
    })

    it('should throw when config is not an object', async () => {
      mockFileHandler.readJson.mockResolvedValue('not an object')

      await expect(command.run([])).rejects.toThrow('Config must be a valid JSON object')
    })
  })
})
