import { ConsoleService } from '@/shared/console'
import { DependencyService } from '@/shared/dependency'
import { checkDependencies } from './setup'

jest.mock('@/shared/console')
jest.mock('@/shared/dependency')

describe('checkDependencies', () => {
  let mockApp: {
    get: jest.Mock
    close: jest.Mock
  }
  let mockConsole: jest.Mocked<ConsoleService>
  let mockDependency: jest.Mocked<DependencyService>

  const originalArgv = process.argv

  beforeEach(() => {
    jest.clearAllMocks()

    mockConsole = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      fail: jest.fn(),
      log: jest.fn(),
      start: jest.fn(),
      done: jest.fn()
    } as unknown as jest.Mocked<ConsoleService>

    mockDependency = {
      check: jest.fn(),
      which: jest.fn()
    } as unknown as jest.Mocked<DependencyService>

    mockApp = {
      get: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    }

    mockApp.get.mockImplementation((token: unknown) => {
      if (token === ConsoleService) return mockConsole
      if (token === DependencyService) return mockDependency
      return undefined
    })
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  describe('skip flags', () => {
    it('should skip check when --help is provided', async () => {
      process.argv = ['node', 'cli', '--help']

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockApp.get).not.toHaveBeenCalled()
      expect(mockApp.close).not.toHaveBeenCalled()
    })

    it('should skip check when --version is provided', async () => {
      process.argv = ['node', 'cli', '--version']

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockApp.get).not.toHaveBeenCalled()
    })

    it('should skip check when -h is provided', async () => {
      process.argv = ['node', 'cli', '-h']

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockApp.get).not.toHaveBeenCalled()
    })

    it('should skip check when -v is provided', async () => {
      process.argv = ['node', 'cli', '-v']

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockApp.get).not.toHaveBeenCalled()
    })
  })

  describe('dependency check', () => {
    it('should return true when dependencies are missing', async () => {
      process.argv = ['node', 'cli']
      mockDependency.check.mockResolvedValue({
        missing: [
          {
            name: 'git',
            requiredVersion: '>=2.30',
            installedVersion: null,
            installedPath: null,
            isMet: false
          }
        ],
        warnings: []
      })

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(true)
      expect(mockConsole.debug).toHaveBeenCalledWith('Checking required dependencies...')
      expect(mockConsole.error).toHaveBeenCalledWith('Missing dependencies:')
      expect(mockConsole.error).toHaveBeenCalledWith('  - git (required: >=2.30)')
      expect(mockApp.close).toHaveBeenCalled()
    })

    it('should return false when all dependencies are met', async () => {
      process.argv = ['node', 'cli']
      mockDependency.check.mockResolvedValue({
        missing: [],
        warnings: []
      })

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockConsole.debug).toHaveBeenCalledWith('All required dependencies are installed')
      expect(mockApp.close).toHaveBeenCalled()
    })

    it('should return false and show warnings when dependencies have version warnings', async () => {
      process.argv = ['node', 'cli']
      mockDependency.check.mockResolvedValue({
        missing: [],
        warnings: [
          {
            name: 'git',
            installedVersion: '2.20.0',
            requiredVersion: '>=2.30',
            installedPath: '/usr/bin/git'
          }
        ]
      })

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(false)
      expect(mockConsole.warn).toHaveBeenCalledWith('Dependency warnings:')
      expect(mockConsole.warn).toHaveBeenCalledWith('  - git: 2.20.0 found, >=2.30 recommended')
      expect(mockConsole.debug).toHaveBeenCalledWith('All required dependencies are installed')
    })

    it('should show missing dep without version when requiredVersion is null', async () => {
      process.argv = ['node', 'cli']
      mockDependency.check.mockResolvedValue({
        missing: [
          {
            name: 'custom-tool',
            requiredVersion: null,
            installedVersion: null,
            installedPath: null,
            isMet: false
          }
        ],
        warnings: []
      })

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(true)
      expect(mockConsole.error).toHaveBeenCalledWith('  - custom-tool')
    })

    it('should show multiple missing dependencies', async () => {
      process.argv = ['node', 'cli']
      mockDependency.check.mockResolvedValue({
        missing: [
          {
            name: 'git',
            requiredVersion: '>=2.30',
            installedVersion: null,
            installedPath: null,
            isMet: false
          },
          {
            name: 'docker',
            requiredVersion: '>=24.0',
            installedVersion: null,
            installedPath: null,
            isMet: false
          }
        ],
        warnings: []
      })

      const result = await checkDependencies(mockApp as any)

      expect(result).toBe(true)
      expect(mockConsole.error).toHaveBeenCalledWith('  - git (required: >=2.30)')
      expect(mockConsole.error).toHaveBeenCalledWith('  - docker (required: >=24.0)')
    })
  })
})
