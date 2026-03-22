import { readFileSync } from 'node:fs'

import { loadConfig } from './config.loader'

jest.mock('node:fs')

describe('ConfigLoader', () => {
  const mockConfig = {
    app: {
      environment: 'development',
      debug: false,
      secretKey: 'test-secret-key',
      loggerLevels: ['log', 'error', 'warn']
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig))
  })

  afterEach(() => {
    delete process.env.NODE_ENV
    delete process.env.DEBUG
    delete process.env.APP_SECRET_KEY
    delete process.env.APP_LOGGER_LEVELS
  })

  it('should load config from file', () => {
    const config = loadConfig()

    expect(config).toEqual(mockConfig)
    expect(readFileSync).toHaveBeenCalled()
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

  it('should override loggerLevels with APP_LOGGER_LEVELS', () => {
    process.env.APP_LOGGER_LEVELS = 'log,error'

    const config = loadConfig()

    expect(config.app.loggerLevels).toEqual(['log', 'error'])
  })

  it('should split APP_LOGGER_LEVELS by comma', () => {
    process.env.APP_LOGGER_LEVELS = 'log,error,warn,debug'

    const config = loadConfig()

    expect(config.app.loggerLevels).toHaveLength(4)
    expect(config.app.loggerLevels).toEqual(['log', 'error', 'warn', 'debug'])
  })
})
