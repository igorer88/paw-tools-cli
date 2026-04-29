import { mockConsoleService, mockProcessService } from '@mocks/shared'
import { CommandRunner } from 'nest-commander'
import { ConsoleService } from '@/shared/console'
import { DependencyService } from '@/shared/dependency'
import { ExitCodes } from '@/shared/exit-codes'
import { ProcessService } from '@/shared/process'
import { DoctorCommand } from './doctor.command'

// Mock the dependencies
jest.mock('@/shared/console', () => ({
  ConsoleService: jest.fn().mockImplementation(() => mockConsoleService)
}))

jest.mock('@/shared/dependency', () => ({
  DependencyService: jest.fn().mockImplementation(() => ({
    check: jest.fn(),
    which: jest.fn()
  }))
}))

jest.mock('@/shared/process', () => ({
  ProcessService: jest.fn().mockImplementation(() => mockProcessService)
}))

// Mock process.exit to be a no-op
jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)

describe('DoctorCommand', () => {
  let command: DoctorCommand
  let consoleService: jest.Mocked<ConsoleService>
  let dependencyService: jest.Mocked<DependencyService>

  beforeEach(() => {
    jest.clearAllMocks()

    command = new DoctorCommand()

    consoleService = (ConsoleService as jest.Mock).mock.results[0].value
    dependencyService = (DependencyService as jest.Mock).mock.results[0].value
  })

  it('should be defined', () => {
    expect(command).toBeDefined()
  })

  it('should extend CommandRunner', () => {
    expect(command).toBeInstanceOf(CommandRunner)
  })

  describe('run', () => {
    it('should check dependencies and display results', async () => {
      dependencyService.check.mockResolvedValue({
        missing: [],
        warnings: []
      })

      await command.run([], {})

      expect(dependencyService.check).toHaveBeenCalled()
      expect(consoleService.info).toHaveBeenCalledWith(
        expect.stringContaining('Required Dependencies')
      )
    })

    it('should show missing dependencies', async () => {
      dependencyService.check.mockResolvedValue({
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

      await command.run([], {})

      expect(process.exit).toHaveBeenCalledWith(ExitCodes.ERROR)
      expect(consoleService.info).toHaveBeenCalledWith(expect.stringContaining('git'))
    })

    it('should show warnings for version mismatches', async () => {
      dependencyService.check.mockResolvedValue({
        missing: [],
        warnings: [
          {
            name: 'docker',
            installedVersion: '20.0',
            requiredVersion: '>=24.0',
            installedPath: '/usr/bin/docker'
          }
        ]
      })

      await command.run([], {})

      expect(consoleService.info).toHaveBeenCalledWith(expect.stringContaining('docker'))
    })

    it('should show optional dependencies in verbose mode', async () => {
      dependencyService.check.mockResolvedValue({
        missing: [],
        warnings: []
      })
      dependencyService.which.mockReturnValue('/usr/bin/docker')

      await command.run([], { verbose: true })

      expect(dependencyService.which).toHaveBeenCalledWith('docker')
    })

    it('should handle missing optional dependencies in verbose mode', async () => {
      dependencyService.check.mockResolvedValue({
        missing: [],
        warnings: []
      })
      dependencyService.which.mockReturnValue(null)

      await command.run([], { verbose: true })

      expect(consoleService.info).toHaveBeenCalled()
    })

    it('should display success when all dependencies are met', async () => {
      dependencyService.check.mockResolvedValue({
        missing: [],
        warnings: []
      })

      await command.run([], {})

      expect(consoleService.success).toHaveBeenCalledWith(expect.stringContaining('OK'))
    })
  })
})
