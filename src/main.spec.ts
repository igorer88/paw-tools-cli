import { mockConsoleService, mockDependencyService } from '@mocks/shared'
import { CommandFactory } from 'nest-commander'

import { REQUIRED_DEPENDENCIES } from './config/constants/dependencies.constants'
import { ExitCodes } from './shared/exit-codes'

jest.mock('nest-commander', () => require('@mocks/nest-commander'))

jest.mock('./app.module', () => ({
  AppModule: class AppModule {}
}))

const mockCommandFactory = CommandFactory as jest.Mocked<typeof CommandFactory>

describe('bootstrap', () => {
  let exitSpy: jest.SpyInstance
  let originalArgv: string[]

  const mockApp = {
    close: jest.fn().mockResolvedValue(undefined),
    get: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    originalArgv = [...process.argv]
    mockCommandFactory.createWithoutRunning.mockResolvedValue(mockApp as never)
    mockCommandFactory.runApplication.mockResolvedValue(undefined)
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    mockApp.get.mockImplementation((token: unknown) => {
      if ((token as any).name === 'DependencyService') return mockDependencyService
      if ((token as any).name === 'ConsoleService') return mockConsoleService
      return undefined
    })
  })

  afterEach(() => {
    process.argv = originalArgv
    exitSpy.mockRestore()
  })

  it('should create app and run when deps are OK', async () => {
    process.argv = ['node', 'cli']
    mockDependencyService.check.mockResolvedValue({ missing: [], warnings: [] })

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockCommandFactory.createWithoutRunning).toHaveBeenCalled()
    expect(mockDependencyService.check).toHaveBeenCalledWith(REQUIRED_DEPENDENCIES)
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('should exit with error when dependencies are missing', async () => {
    process.argv = ['node', 'cli']
    mockDependencyService.check.mockResolvedValue({
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

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockCommandFactory.createWithoutRunning).toHaveBeenCalled()
    expect(mockDependencyService.check).toHaveBeenCalled()
    expect(mockConsoleService.error).toHaveBeenCalledWith('Missing dependencies:')
    expect(mockConsoleService.error).toHaveBeenCalledWith('  - git (required: >=2.30)')
    expect(mockApp.close).toHaveBeenCalled()
    expect(process.exit).toHaveBeenCalledWith(ExitCodes.ERROR)
    expect(mockCommandFactory.runApplication).not.toHaveBeenCalled()
  })

  it('should show warnings but continue when deps have warnings', async () => {
    process.argv = ['node', 'cli']
    mockDependencyService.check.mockResolvedValue({
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

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockConsoleService.warn).toHaveBeenCalledWith('Dependency warnings:')
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
    expect(process.exit).not.toHaveBeenCalled()
  })

  it('should skip check when --help is provided', async () => {
    process.argv = ['node', 'cli', '--help']

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockDependencyService.check).not.toHaveBeenCalled()
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
  })

  it('should skip check when --version is provided', async () => {
    process.argv = ['node', 'cli', '--version']

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockDependencyService.check).not.toHaveBeenCalled()
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
  })

  it('should skip check when -h is provided', async () => {
    process.argv = ['node', 'cli', '-h']

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockDependencyService.check).not.toHaveBeenCalled()
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
  })

  it('should skip check when -v is provided', async () => {
    process.argv = ['node', 'cli', '-v']

    const { bootstrap } = await import('./main')
    await bootstrap()

    expect(mockDependencyService.check).not.toHaveBeenCalled()
    expect(mockCommandFactory.runApplication).toHaveBeenCalledWith(mockApp)
  })
})
