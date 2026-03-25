import type { LogLevel } from '@nestjs/common'

describe('LoggerConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should use default log levels when env not set', () => {
    delete process.env.APP_LOGGER_LEVELS

    const { logLevel } = require('./logger.config')

    expect(logLevel).toEqual(['log', 'error', 'warn', 'debug', 'verbose', 'fatal'])
  })

  it('should parse custom log levels from APP_LOGGER_LEVELS', () => {
    process.env.APP_LOGGER_LEVELS = 'log,error,warn'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toEqual(['log', 'error', 'warn'])
  })

  it('should handle single log level', () => {
    process.env.APP_LOGGER_LEVELS = 'error'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toEqual(['error'])
  })

  it('should handle empty APP_LOGGER_LEVELS', () => {
    process.env.APP_LOGGER_LEVELS = ''

    const { logLevel } = require('./logger.config')

    expect(logLevel).toEqual([''])
  })

  it('should handle all NestJS log levels', () => {
    const allLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal']
    process.env.APP_LOGGER_LEVELS = allLevels.join(',')

    const { logLevel } = require('./logger.config')

    expect(logLevel).toEqual(allLevels)
  })
})
