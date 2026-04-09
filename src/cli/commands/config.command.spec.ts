// biome-ignore-all lint/complexity/useLiteralKeys: bracket notation required for private access

import type { Testable } from '@/typings/tests'

import { ConfigCommand } from './config.command'

const mockFileHandler = {
  exists: jest.fn().mockReturnValue(true),
  readJson: jest.fn().mockResolvedValue({ app: { debug: true } }),
  writeJson: jest.fn().mockResolvedValue(undefined),
  ensureDir: jest.fn().mockResolvedValue(undefined)
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
  let processExitSpy: jest.SpyInstance
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    process.env = { ...originalEnv }
    delete process.env.PAW_CONFIG
    mockFileHandler.exists.mockReturnValue(true)
    mockFileHandler.readJson.mockResolvedValue({ app: { debug: true } })
    mockConsoleService.success.mockClear()
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never)
    command = new ConfigCommand()
  })

  afterEach(() => {
    processExitSpy.mockRestore()
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

  describe('parseExport', () => {
    it('should return custom path when provided', () => {
      const result = command.parseExport('./custom.json')
      expect(result).toBe('./custom.json')
    })

    it('should return default path when no value', () => {
      const result = command.parseExport()
      expect(result).toContain('config')
      expect(result).toContain('config.json')
    })

    it('should return default path for empty string', () => {
      const result = command.parseExport('')
      expect(result).toContain('config')
    })
  })

  describe('exportConfig', () => {
    it('should export config to specified path', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      await (command as Testable<ConfigCommand>)['exportConfig']('/tmp/test.json')

      expect(mockFileHandler.ensureDir).toHaveBeenCalledWith('/tmp')
      expect(mockFileHandler.writeJson).toHaveBeenCalledWith(
        '/tmp/test.json',
        expect.objectContaining({
          app: expect.objectContaining({
            logger: expect.objectContaining({
              level: 'debug'
            })
          })
        })
      )
      expect(mockConsoleService.success).toHaveBeenCalledWith('Config exported to: /tmp/test.json')
    })

    it('should throw error when file already exists', async () => {
      mockFileHandler.exists.mockReturnValue(true)

      await expect(
        (command as Testable<ConfigCommand>)['exportConfig']('/existing.json')
      ).rejects.toThrow('Config file already exists: /existing.json')
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

    it('should call process.exit(1) when config file does not exist', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      await command.run([])

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalled()
    })

    it('should call process.exit(1) when config read fails', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockRejectedValue(new Error('Read error'))

      await command.run([])

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalled()
    })

    it('should call process.exit(1) when config is not an object', async () => {
      mockFileHandler.readJson.mockResolvedValue('not an object')

      await command.run([])

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalled()
    })
  })

  describe('run with --export', () => {
    beforeEach(() => {
      mockFileHandler.exists.mockReturnValue(false)
      mockFileHandler.writeJson.mockClear()
      mockConsoleService.success.mockClear()
    })

    it('should export to default path when flag used without value', async () => {
      await command.run([], { export: '' as unknown as string })

      expect(mockFileHandler.writeJson).toHaveBeenCalled()
      expect(mockConsoleService.success).toHaveBeenCalledWith(
        expect.stringContaining('Config exported to:')
      )
    })

    it('should export to custom path when path provided', async () => {
      await command.run([], { export: './custom-config.json' })

      expect(mockFileHandler.ensureDir).toHaveBeenCalled()
      expect(mockFileHandler.writeJson).toHaveBeenCalledWith(
        './custom-config.json',
        expect.objectContaining({
          app: expect.objectContaining({})
        })
      )
    })

    it('should exit with error when export file already exists', async () => {
      mockFileHandler.exists.mockReturnValue(true)

      await command.run([], { export: './existing.json' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalled()
    })

    it('should use default path when export is truthy but not a string', async () => {
      await command.run([], { export: true as unknown as string })

      expect(mockFileHandler.writeJson).toHaveBeenCalled()
      expect(mockConsoleService.success).toHaveBeenCalledWith(
        expect.stringContaining('Config exported to:')
      )
    })
  })

  describe('parseList', () => {
    it('should return true when flag is provided', () => {
      const result = command.parseList()
      expect(result).toBe(true)
    })
  })

  describe('parseGet', () => {
    it('should return the provided key value', () => {
      const result = command.parseGet('app.logger.level')
      expect(result).toBe('app.logger.level')
    })
  })

  describe('parseSet', () => {
    it('should return the provided key=value string', () => {
      const result = command.parseSet('app.logger.level=debug')
      expect(result).toBe('app.logger.level=debug')
    })
  })

  describe('parseValidate', () => {
    it('should return true when flag is provided', () => {
      const result = command.parseValidate()
      expect(result).toBe(true)
    })
  })

  describe('getConfigValue', () => {
    it('should return value for simple key', () => {
      const config = { app: { level: 'info' } }
      const result = (command as Testable<ConfigCommand>)['getConfigValue'](config, 'app')
      expect(result).toEqual({ level: 'info' })
    })

    it('should return value for nested key', () => {
      const config = { app: { logger: { level: 'info' } } }
      const result = (command as Testable<ConfigCommand>)['getConfigValue'](
        config,
        'app.logger.level'
      )
      expect(result).toBe('info')
    })

    it('should return undefined for non-existent key', () => {
      const config = { app: { logger: { level: 'info' } } }
      const result = (command as Testable<ConfigCommand>)['getConfigValue'](
        config,
        'app.missing.key'
      )
      expect(result).toBeUndefined()
    })
  })

  describe('setConfigValue', () => {
    it('should set simple key value', () => {
      const config = { app: {} }
      const result = (command as Testable<ConfigCommand>)['setConfigValue'](
        config,
        'app.test',
        'value'
      )
      expect(result).toEqual({ app: { test: 'value' } })
    })

    it('should set nested key value', () => {
      const config = { app: { logger: {} } }
      const result = (command as Testable<ConfigCommand>)['setConfigValue'](
        config,
        'app.logger.level',
        'debug'
      )
      expect(result).toEqual({ app: { logger: { level: 'debug' } } })
    })

    it('should create nested path when not exists', () => {
      const config = { app: {} }
      const result = (command as Testable<ConfigCommand>)['setConfigValue'](
        config,
        'app.logger.level',
        'info'
      )
      expect(result).toEqual({ app: { logger: { level: 'info' } } })
    })

    it('should preserve original config (immutability)', () => {
      const config = { app: { logger: { level: 'info' } } }
      ;(command as Testable<ConfigCommand>)['setConfigValue'](config, 'app.new', 'value')
      expect(config).toEqual({ app: { logger: { level: 'info' } } })
    })
  })

  describe('parseValue', () => {
    it('should parse "true" as boolean true', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('true')
      expect(result).toBe(true)
    })

    it('should parse "false" as boolean false', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('false')
      expect(result).toBe(false)
    })

    it('should parse "null" as null', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('null')
      expect(result).toBe(null)
    })

    it('should parse "undefined" as undefined', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('undefined')
      expect(result).toBeUndefined()
    })

    it('should parse numeric string as number', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('123')
      expect(result).toBe(123)
    })

    it('should return string for non-special strings', () => {
      const result = (command as Testable<ConfigCommand>)['parseValue']('hello world')
      expect(result).toBe('hello world')
    })
  })

  describe('buildMergedConfig', () => {
    it('should return defaults when config is empty', () => {
      const config = {}
      const result = (command as Testable<ConfigCommand>)['buildMergedConfig'](config)
      expect(result).toHaveProperty('app.logger.level', 'debug')
      expect(result).toHaveProperty('app.logger.format', 'pretty')
    })

    it('should merge partial config with defaults', () => {
      const config = { app: { logger: { level: 'error' } } }
      const result = (command as Testable<ConfigCommand>)['buildMergedConfig'](config)
      expect(result).toHaveProperty('app.logger.level', 'error')
      expect(result).toHaveProperty('app.logger.format', 'pretty')
    })

    it('should override defaults with full config', () => {
      const config = { app: { secretKey: 'key', logger: { level: 'info', tag: true } } }
      const result = (command as Testable<ConfigCommand>)['buildMergedConfig'](config)
      expect(result).toHaveProperty('app.secretKey', 'key')
      expect(result).toHaveProperty('app.logger.level', 'info')
      expect(result).toHaveProperty('app.logger.tag', true)
    })

    it('should handle nested object when target has primitive at path', () => {
      const config = { app: { secretKey: 'key' } }
      const result = (command as Testable<ConfigCommand>)['buildMergedConfig'](config)
      expect(result).toHaveProperty('app.secretKey', 'key')
      expect(result).toHaveProperty('app.logger')
    })

    it('should merge new keys not in defaults', () => {
      const config = { app: { customField: 'custom' } }
      const result = (command as Testable<ConfigCommand>)['buildMergedConfig'](config)
      expect(result).toHaveProperty('app.customField', 'custom')
    })
  })

  describe('formatValue', () => {
    it('should format primitive values as string', () => {
      expect((command as Testable<ConfigCommand>)['formatValue']('test')).toBe('test')
      expect((command as Testable<ConfigCommand>)['formatValue'](123)).toBe('123')
      expect((command as Testable<ConfigCommand>)['formatValue'](true)).toBe('true')
    })

    it('should format objects as JSON string', () => {
      const obj = { level: 'info', tag: false }
      const result = (command as Testable<ConfigCommand>)['formatValue'](obj)
      expect(result).toContain('"level": "info"')
    })
  })

  describe('run with --list', () => {
    it('should list all config values', async () => {
      await command.run([], { list: true })

      expect(mockConsoleService.info).toHaveBeenCalledWith(expect.stringContaining('Config file:'))
      expect(mockConsoleService.log).toHaveBeenCalled()
    })
  })

  describe('run with --get', () => {
    it('should get specific config value', async () => {
      await command.run([], { get: 'app.logger.format' })

      expect(mockConsoleService.log).toHaveBeenCalledWith('pretty')
    })

    it('should exit with error when key not found', async () => {
      mockFileHandler.readJson.mockResolvedValue({})

      await command.run([], { get: 'nonexistent.key' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ message: 'Key not found: nonexistent.key' })
      )
    })
  })

  describe('run with --set', () => {
    it('should set config value in file', async () => {
      await command.run([], { set: 'app.logger.level=error' })

      expect(mockFileHandler.writeJson).toHaveBeenCalled()
      expect(mockConsoleService.success).toHaveBeenCalledWith(expect.stringContaining('Updated'))
    })

    it('should exit with error for invalid format', async () => {
      await command.run([], { set: 'invalid' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ message: 'Invalid --set format. Use: --set key=value' })
      )
    })

    it('should exit with error when write fails', async () => {
      mockFileHandler.writeJson.mockRejectedValue(new Error('Write failed'))

      await command.run([], { set: 'app.test=value' })

      expect(processExitSpy).toHaveBeenCalledWith(1)
      expect(mockConsoleService.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ message: 'Write failed' })
      )
    })
  })

  describe('run with --validate', () => {
    it('should validate and output success', async () => {
      await command.run([], { validate: true })

      expect(mockConsoleService.success).toHaveBeenCalledWith(expect.stringContaining('valid'))
    })
  })
})
