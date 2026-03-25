import { createConsola } from 'consola'

import { ConsoleService } from './console.service'

jest.mock('consola', () => ({
  createConsola: jest.fn()
}))

describe('ConsoleService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.APP_LOGGER_LEVELS
    delete process.env.APP_LOGGER_TAG
    delete process.env.APP_LOGGER_DATE
    delete process.env.APP_LOGGER_FORMAT
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should create service with default settings', () => {
      const service = new ConsoleService()
      expect(service).toBeDefined()
    })

    it('should create logger with tag when APP_LOGGER_TAG is true', () => {
      process.env.APP_LOGGER_TAG = 'true'
      const mockWithTag = jest.fn().mockReturnValue({} as ReturnType<typeof createConsola>)
      ;(createConsola as jest.Mock).mockReturnValue({ withTag: mockWithTag })

      new ConsoleService()

      expect(mockWithTag).toHaveBeenCalledWith('paw-tools')
    })

    it('should not add tag when APP_LOGGER_TAG is false', () => {
      process.env.APP_LOGGER_TAG = 'false'
      const mockLogger = { withTag: jest.fn() }
      ;(createConsola as jest.Mock).mockReturnValue(mockLogger)

      new ConsoleService()

      expect(mockLogger.withTag).not.toHaveBeenCalled()
    })
  })

  describe('log methods', () => {
    let service: ConsoleService
    let mockLogger: { [key: string]: jest.Mock }

    beforeEach(() => {
      mockLogger = {
        info: jest.fn(),
        success: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        start: jest.fn(),
        fail: jest.fn(),
        log: jest.fn()
      }
      ;(createConsola as jest.Mock).mockReturnValue(mockLogger)
      service = new ConsoleService()
    })

    describe('info', () => {
      it('should call logger.info with message and args', () => {
        service.info('Test message', 'arg1', 'arg2')

        expect(mockLogger.info).toHaveBeenCalledWith('Test message', 'arg1', 'arg2')
      })
    })

    describe('success', () => {
      it('should call logger.success with message', () => {
        service.success('Success message')

        expect(mockLogger.success).toHaveBeenCalledWith('Success message')
      })
    })

    describe('warn', () => {
      it('should call logger.warn with message', () => {
        service.warn('Warning message')

        expect(mockLogger.warn).toHaveBeenCalledWith('Warning message')
      })
    })

    describe('error', () => {
      it('should call logger.error with message', () => {
        service.error('Error message')

        expect(mockLogger.error).toHaveBeenCalledWith('Error message')
      })
    })

    describe('debug', () => {
      it('should call logger.debug with message', () => {
        service.debug('Debug message')

        expect(mockLogger.debug).toHaveBeenCalledWith('Debug message')
      })
    })

    describe('start', () => {
      it('should call logger.start with message', () => {
        service.start('Starting...')

        expect(mockLogger.start).toHaveBeenCalledWith('Starting...')
      })
    })

    describe('done', () => {
      it('should call logger.success with message', () => {
        service.done('Done!')

        expect(mockLogger.success).toHaveBeenCalledWith('Done!')
      })
    })

    describe('fail', () => {
      it('should call logger.fail with message', () => {
        service.fail('Failed!')

        expect(mockLogger.fail).toHaveBeenCalledWith('Failed!')
      })
    })

    describe('log', () => {
      it('should call logger.log with message', () => {
        service.log('Log message')

        expect(mockLogger.log).toHaveBeenCalledWith('Log message')
      })
    })
  })

  describe('log level parsing', () => {
    it('should parse numeric log level', () => {
      process.env.APP_LOGGER_LEVELS = '5'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 5 }))
    })

    it('should parse named log level fatal', () => {
      process.env.APP_LOGGER_LEVELS = 'fatal'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 0 }))
    })

    it('should parse named log level error', () => {
      process.env.APP_LOGGER_LEVELS = 'error'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 1 }))
    })

    it('should parse named log level warn', () => {
      process.env.APP_LOGGER_LEVELS = 'warn'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 2 }))
    })

    it('should parse named log level log', () => {
      process.env.APP_LOGGER_LEVELS = 'log'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 3 }))
    })

    it('should parse named log level info', () => {
      process.env.APP_LOGGER_LEVELS = 'info'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 4 }))
    })

    it('should parse named log level success', () => {
      process.env.APP_LOGGER_LEVELS = 'success'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 5 }))
    })

    it('should parse named log level debug', () => {
      process.env.APP_LOGGER_LEVELS = 'debug'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 6 }))
    })

    it('should default to level 3 when APP_LOGGER_LEVELS is not set', () => {
      delete process.env.APP_LOGGER_LEVELS
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 3 }))
    })

    it('should default to level 3 when APP_LOGGER_LEVELS is invalid', () => {
      process.env.APP_LOGGER_LEVELS = 'invalid'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(expect.objectContaining({ level: 3 }))
    })
  })

  describe('formatOptions', () => {
    it('should set date option when APP_LOGGER_DATE is true', () => {
      process.env.APP_LOGGER_DATE = 'true'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(
        expect.objectContaining({
          formatOptions: expect.objectContaining({ date: true })
        })
      )
    })

    it('should not set date option when APP_LOGGER_DATE is false', () => {
      process.env.APP_LOGGER_DATE = 'false'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(
        expect.objectContaining({
          formatOptions: expect.objectContaining({ date: false })
        })
      )
    })
  })

  describe('APP_LOGGER_FORMAT', () => {
    it('should use JSON reporter when format is json', () => {
      process.env.APP_LOGGER_FORMAT = 'json'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(
        expect.objectContaining({
          reporters: expect.arrayContaining([
            expect.objectContaining({
              log: expect.any(Function)
            })
          ])
        })
      )
    })

    it('should use pretty reporter when format is pretty', () => {
      process.env.APP_LOGGER_FORMAT = 'pretty'
      ;(createConsola as jest.Mock).mockReturnValue({})

      new ConsoleService()

      expect(createConsola).toHaveBeenCalledWith(
        expect.objectContaining({
          formatOptions: expect.any(Object)
        })
      )
    })
  })
})
