import '@mocks/node'
import { mockExecCallback, mockExecSync, mockPlatform, mockSpawn } from '@mocks/node'

import { CommandValidator } from './command.validator'
import { ProcessService } from './process.service'

function mockExecSuccess(stdout: string, stderr = ''): void {
  mockExecCallback.mockImplementation((cb: Function) => cb(null, stdout, stderr))
}

function mockExecFailure(error: Error | object): void {
  mockExecCallback.mockImplementation((cb: Function) => cb(error))
}

describe('ProcessService', () => {
  let service: ProcessService

  beforeEach(() => {
    jest.clearAllMocks()
    mockExecCallback.mockReset()
    mockExecSync.mockReset()
    service = new ProcessService()
  })

  describe('exec', () => {
    it('should execute a command and return stdout', async () => {
      mockExecSuccess('hello\n')

      const result = await service.exec('echo "hello"')

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello')
      expect(result.stderr).toBe('')
    })

    it('should return error on failed command', async () => {
      const error = new Error('command failed') as Error & { code?: string; killed?: boolean }
      error.code = '1'
      mockExecFailure(error)

      const result = await service.exec('exit 1')

      expect(result.exitCode).toBe(1)
      expect(result.error).toBeDefined()
    })

    it('should return error on validation failure', async () => {
      const result = await service.exec('echo test; rm -rf /')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('dangerous shell characters')
      expect(result.error).toBeDefined()
    })

    it('should handle error with no message property (line 45)', async () => {
      const error = { code: '1' } as Error & { code?: string; killed?: boolean }
      mockExecFailure(error)

      const result = await service.exec('bad command')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe(String(error))
    })
  })

  describe('execSync', () => {
    it('should execute a command synchronously', () => {
      mockExecSync.mockReturnValue('sync hello\n')

      const result = service.execSync('echo "sync hello"')

      expect(result).toBe('sync hello')
    })

    it('should throw on failed command', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('command failed')
      })

      expect(() => service.execSync('exit 1')).toThrow()
    })

    it('should throw on validation failure', () => {
      expect(() => service.execSync('echo $HOME')).toThrow()
    })
  })

  describe('spawn', () => {
    it('should return a ChildProcess', () => {
      const mockChildProcess = { kill: jest.fn() }
      mockSpawn.mockReturnValue(mockChildProcess)

      const child = service.spawn('echo', ['spawned'])

      expect(child).toBeDefined()
      expect(child.kill).toBeDefined()
    })

    it('should throw on dangerous arguments', () => {
      expect(() => service.spawn('echo', ['test; rm -rf /'])).toThrow()
    })
  })

  describe('CommandValidator integration', () => {
    it('should validate commands using CommandValidator', () => {
      const validator = new CommandValidator()
      expect(() => validator.validate('echo test')).not.toThrow()
      expect(() => validator.validate('echo $PATH')).toThrow()
    })
  })

  describe('which', () => {
    it('should return path for installed command on Unix', () => {
      mockPlatform.mockReturnValue('darwin')
      mockExecSync.mockReturnValue('/usr/bin/git\n')

      const result = service.which('git')

      expect(result).toBe('/usr/bin/git')
      expect(mockExecSync).toHaveBeenCalledWith('which git', { encoding: 'utf-8' })
    })

    it('should use "where" command on Windows (line 86)', () => {
      mockPlatform.mockReturnValue('win32')
      mockExecSync.mockReturnValue('C:\\Program Files\\Git\\cmd\\git.exe\n')

      const result = service.which('git')

      expect(result).toBe('C:\\Program Files\\Git\\cmd\\git.exe')
      expect(mockExecSync).toHaveBeenCalledWith('where git', { encoding: 'utf-8' })
    })

    it('should return null for non-existent command', () => {
      mockPlatform.mockReturnValue('darwin')
      mockExecSync.mockImplementation(() => {
        throw new Error('not found')
      })

      const result = service.which('non-existent-command-xyz-12345')

      expect(result).toBeNull()
    })

    it('should throw on dangerous command name', () => {
      expect(() => service.which('echo; rm -rf')).toThrow()
    })
  })

  describe('getVersion', () => {
    it('should return version for command', async () => {
      mockExecSuccess('git version 2.50.1\n')

      const version = await service.getVersion('git')

      expect(version).toBe('2.50.1')
    })

    it('should return version from stderr when stdout is empty (line 103)', async () => {
      mockExecSuccess('', 'node v22.0.0\n')

      const version = await service.getVersion('node')

      expect(version).toBe('22.0.0')
    })

    it('should handle version with v prefix', async () => {
      mockExecSuccess('v2.50.1\n')

      const version = await service.getVersion('git')

      expect(version).toBe('2.50.1')
    })

    it('should handle 4-part version numbers', async () => {
      mockExecSuccess('version 2.50.1.1\n')

      const version = await service.getVersion('tool')

      expect(version).toBe('2.50.1.1')
    })

    it('should return null when output has no semver pattern', async () => {
      mockExecSuccess('no version here\n')

      const version = await service.getVersion('tool')

      expect(version).toBeNull()
    })

    it('should return null for non-existent command', async () => {
      mockExecFailure(new Error('command not found'))

      const version = await service.getVersion('non-existent-command-xyz-12345')

      expect(version).toBeNull()
    })

    it('should use custom args', async () => {
      mockExecSuccess('22.0.0\n')

      const version = await service.getVersion('node', ['--version'])

      expect(version).toBeTruthy()
      expect(version).toMatch(/\d+/)
      expect(mockExecCallback).toHaveBeenCalled()
    })
  })
})
