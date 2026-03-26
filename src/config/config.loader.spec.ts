import { existsSync, readFileSync } from 'node:fs'

import { loadConfig } from './config.loader'

jest.mock('node:fs')

describe('ConfigLoader', () => {
  const originalEnv = process.env

  const mockConfig = {
    app: {
      environment: 'development',
      debug: false,
      secretKey: 'test-secret-key',
      logger: {
        level: 'debug',
        tag: false,
        date: false,
        format: 'pretty'
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
    delete process.env.DEBUG
    delete process.env.APP_SECRET_KEY
    delete process.env.APP_LOGGER_LEVELS
    delete process.env.APP_LOGGER_TAG
    delete process.env.APP_LOGGER_DATE
    delete process.env.APP_LOGGER_FORMAT
    ;(existsSync as jest.Mock).mockReturnValue(true)
    ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig))
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should load config from file', () => {
    const config = loadConfig()

    expect(config.app.environment).toBe('development')
    expect(readFileSync).toHaveBeenCalled()
  })

  it('should use default config when file does not exist', () => {
    ;(existsSync as jest.Mock).mockReturnValue(false)

    const config = loadConfig()

    expect(config.app.environment).toBe('development')
    expect(config.app.logger.level).toBe('debug')
  })

  it('should override environment with NODE_ENV', () => {
    process.env.NODE_ENV = 'production'

    const config = loadConfig()

    expect(config.app.environment).toBe('production')
  })

  it('should override debug with DEBUG=true', () => {
    process.env.DEBUG = 'true'

    const config = loadConfig()

    expect(config.app.debug).toBe(true)
  })

  it('should not override debug when DEBUG=false', () => {
    process.env.DEBUG = 'false'

    const config = loadConfig()

    expect(config.app.debug).toBe(false)
  })

  it('should override secretKey with APP_SECRET_KEY', () => {
    process.env.APP_SECRET_KEY = 'my-custom-secret'

    const config = loadConfig()

    expect(config.app.secretKey).toBe('my-custom-secret')
  })

  it('should override logger level with APP_LOGGER_LEVELS', () => {
    process.env.APP_LOGGER_LEVELS = 'error'

    const config = loadConfig()

    expect(config.app.logger.level).toBe('error')
  })

  it('should override logger tag with APP_LOGGER_TAG', () => {
    process.env.APP_LOGGER_TAG = 'true'

    const config = loadConfig()

    expect(config.app.logger.tag).toBe(true)
  })

  it('should override logger date with APP_LOGGER_DATE', () => {
    process.env.APP_LOGGER_DATE = 'true'

    const config = loadConfig()

    expect(config.app.logger.date).toBe(true)
  })

  it('should override logger format with APP_LOGGER_FORMAT', () => {
    process.env.APP_LOGGER_FORMAT = 'json'

    const config = loadConfig()

    expect(config.app.logger.format).toBe('json')
  })
})
