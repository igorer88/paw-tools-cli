import { existsSync, readFileSync } from 'node:fs'

import { ConfigCommand } from './config.command'

jest.mock('node:fs')

describe('ConfigCommand', () => {
  let command: ConfigCommand
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.PAW_CONFIG
    command = new ConfigCommand()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('resolveConfigPath', () => {
    it('should return custom path when provided', () => {
      const result = (command as any).resolveConfigPath('/custom/config.json')
      expect(result).toBe('/custom/config.json')
    })

    it('should return PAW_CONFIG env var when set', () => {
      process.env.PAW_CONFIG = '/env/config.json'
      const result = (command as any).resolveConfigPath()
      expect(result).toBe('/env/config.json')
    })

    it('should return default path when no custom path or env var', () => {
      const result = (command as any).resolveConfigPath()
      expect(result).toContain('config')
      expect(result).toContain('config.json')
      expect(result).not.toContain('.paw-tools')
    })

    it('should prioritize custom path over env var', () => {
      process.env.PAW_CONFIG = '/env/config.json'
      const result = (command as any).resolveConfigPath('/custom/config.json')
      expect(result).toBe('/custom/config.json')
    })
  })

  describe('loadConfig', () => {
    it('should load valid JSON config', () => {
      const mockConfig = { app: { debug: true } }
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig))

      const result = (command as any).loadConfig('/test/config.json')

      expect(result).toEqual(mockConfig)
      expect(readFileSync).toHaveBeenCalledWith('/test/config.json', 'utf-8')
    })

    it('should throw error when file does not exist', () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)

      expect(() => (command as any).loadConfig('/missing/config.json')).toThrow(
        'Config file not found: /missing/config.json'
      )
    })

    it('should throw error for invalid JSON', () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('invalid json')

      expect(() => (command as any).loadConfig('/test/config.json')).toThrow(
        'Invalid JSON in config file: /test/config.json'
      )
    })
  })

  describe('validateConfig', () => {
    it('should accept valid config object', () => {
      const config = { app: { debug: true } }

      expect(() => (command as any).validateConfig(config)).not.toThrow()
    })

    it('should throw error for null config', () => {
      expect(() => (command as any).validateConfig(null)).toThrow(
        'Config must be a valid JSON object'
      )
    })

    it('should throw error for non-object config', () => {
      expect(() => (command as any).validateConfig('string')).toThrow(
        'Config must be a valid JSON object'
      )
    })
  })

  describe('parseConfig', () => {
    it('should return the provided value', () => {
      const result = command.parseConfig('/custom/path.json')
      expect(result).toBe('/custom/path.json')
    })
  })
})
