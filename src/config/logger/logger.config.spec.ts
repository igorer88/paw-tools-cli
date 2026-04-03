describe('LoggerConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should use default log level when env not set', () => {
    delete process.env.APP_LOGGER_LEVELS

    const { logLevel } = require('./logger.config')

    expect(logLevel).toBe('DEBUG')
  })

  it('should parse custom log level from APP_LOGGER_LEVELS', () => {
    process.env.APP_LOGGER_LEVELS = 'error'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toBe('ERROR')
  })

  it('should handle case-insensitive log level', () => {
    process.env.APP_LOGGER_LEVELS = 'warn'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toBe('WARN')
  })

  it('should handle numeric log level', () => {
    process.env.APP_LOGGER_LEVELS = '6'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toBe('DEBUG')
  })

  it('should handle invalid log level fallback to default', () => {
    process.env.APP_LOGGER_LEVELS = 'invalid'

    const { logLevel } = require('./logger.config')

    expect(logLevel).toBe('DEBUG')
  })
})
