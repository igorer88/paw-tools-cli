import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import * as clack from '@clack/prompts'

import { InitProjectCommand } from './init-project.command'

jest.mock('node:fs')
jest.mock('@clack/prompts', () => ({
  text: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn()
  })),
  cancel: jest.fn(),
  isCancel: jest.fn(() => false)
}))

const mockExec = jest.fn()
jest.mock('node:child_process', () => ({
  exec: (...args: any[]) => mockExec(...args)
}))

describe('InitProjectCommand', () => {
  let command: InitProjectCommand
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    command = new InitProjectCommand()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('should be defined', () => {
    expect(command).toBeDefined()
  })

  describe('run', () => {
    it('should call initializeWithDefaults when --defaults is set', async () => {
      const spy = jest.spyOn(command as any, 'initializeWithDefaults').mockResolvedValue(undefined)

      await command.run([], { defaults: true })

      expect(spy).toHaveBeenCalled()
    })

    it('should call initializeInteractive when no --defaults flag', async () => {
      const spy = jest.spyOn(command as any, 'initializeInteractive').mockResolvedValue(undefined)

      await command.run([])

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('initializeWithDefaults', () => {
    it('should use spinner and default values', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ name: 'old', description: 'old', version: '0.0.0', author: 'old' })
      )
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeWithDefaults()

      expect(mockSpinner.start).toHaveBeenCalled()
      expect(mockSpinner.stop).toHaveBeenCalled()
    })

    it('should skip package.json update if file does not exist', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      ;(existsSync as jest.Mock).mockReturnValue(false)
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeWithDefaults()

      expect(consoleWarnSpy).toHaveBeenCalledWith('package.json not found, skipping update.')
    })
  })

  describe('initializeInteractive', () => {
    it('should prompt for all fields using current config', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'current-name',
          description: 'current-desc',
          version: '1.0.0',
          author: 'current-author'
        })
      )
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeInteractive()

      expect(clack.text).toHaveBeenCalledTimes(4)
      expect(clack.confirm).toHaveBeenCalledTimes(1)
    })

    it('should show changes before confirmation', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('new-name')
        .mockResolvedValueOnce('current-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce('current-author')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'current-name',
          description: 'current-desc',
          version: '1.0.0',
          author: 'current-author'
        })
      )
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeInteractive()

      expect(consoleSpy).toHaveBeenCalledWith('\nChanges to be applied:')
      expect(consoleSpy).toHaveBeenCalledWith('  name: "current-name" → "new-name"')
    })

    it('should cancel when user rejects confirmation', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.confirm as jest.Mock).mockResolvedValue(false)
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('{}')
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as any).initializeInteractive()

      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should cancel on user cancel for name', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as any)

      await expect((command as any).initializeInteractive()).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should cancel on user cancel for description', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as any)

      await expect((command as any).initializeInteractive()).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel on user cancel for version', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as any)

      await expect((command as any).initializeInteractive()).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel on user cancel for author', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as any)

      await expect((command as any).initializeInteractive()).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel when confirmation is cancelled', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('{}')
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as any)

      await expect((command as any).initializeInteractive()).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })
  })

  describe('getCurrentConfig', () => {
    it('should return current values from package.json with git author', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'existing-name',
          description: 'existing-desc',
          version: '2.0.0',
          author: 'old-author'
        })
      )
      mockExec.mockImplementation((cmd: string, cb: Function) => {
        if (cmd.includes('user.name')) cb(null, 'Git User\n')
        else cb(null, 'git@example.com\n')
      })

      const config = await (command as any).getCurrentConfig()

      expect(config).toEqual({
        name: 'existing-name',
        description: 'existing-desc',
        version: '2.0.0',
        author: 'Git User <git@example.com>'
      })
    })

    it('should return defaults when no package.json exists', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      const config = await (command as any).getCurrentConfig()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '1.0.0',
        author: expect.any(String)
      })
    })

    it('should handle malformed package.json', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('invalid json')
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      const config = await (command as any).getCurrentConfig()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '1.0.0',
        author: expect.any(String)
      })
    })

    it('should use defaults for missing fields in package.json', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ name: 'only-name' }))
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      const config = await (command as any).getCurrentConfig()

      expect(config.name).toBe('only-name')
      expect(config.description).toBe('A JavaScript/TypeScript project')
      expect(config.version).toBe('1.0.0')
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default config with generic description', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      const config = await (command as any).getDefaultConfig()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '1.0.0',
        author: expect.any(String)
      })
    })

    it('should use fallback author when git fails', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error('git error')))

      const config = await (command as any).getDefaultConfig()

      expect(config.author).toBe('Unknown <unknown@example.com>')
    })
  })

  describe('getConfigChanges', () => {
    it('should return empty array when no changes', () => {
      const current = {
        name: 'same',
        description: 'same',
        version: '1.0.0',
        author: 'same'
      }
      const updated = { ...current }

      const changes = (command as any).getConfigChanges(current, updated)

      expect(changes).toEqual([])
    })

    it('should return only changed fields', () => {
      const current = {
        name: 'old-name',
        description: 'old-desc',
        version: '1.0.0',
        author: 'old-author'
      }
      const updated = {
        name: 'new-name',
        description: 'old-desc',
        version: '2.0.0',
        author: 'old-author'
      }

      const changes = (command as any).getConfigChanges(current, updated)

      expect(changes).toEqual(['name: "old-name" → "new-name"', 'version: "1.0.0" → "2.0.0"'])
    })

    it('should return all changes when all fields differ', () => {
      const current = {
        name: 'old-name',
        description: 'old-desc',
        version: '1.0.0',
        author: 'old-author'
      }
      const updated = {
        name: 'new-name',
        description: 'new-desc',
        version: '2.0.0',
        author: 'new-author'
      }

      const changes = (command as any).getConfigChanges(current, updated)

      expect(changes).toHaveLength(4)
      expect(changes).toContain('name: "old-name" → "new-name"')
      expect(changes).toContain('description: "old-desc" → "new-desc"')
      expect(changes).toContain('version: "1.0.0" → "2.0.0"')
      expect(changes).toContain('author: "old-author" → "new-author"')
    })
  })

  describe('getGitAuthor', () => {
    it('should return formatted author string', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => {
        if (cmd.includes('user.name')) cb(null, 'John Doe\n')
        else cb(null, 'john@example.com\n')
      })

      const result = await (command as any).getGitAuthor()

      expect(result).toBe('John Doe <john@example.com>')
    })

    it('should reject on name error', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error('git error')))

      await expect((command as any).getGitAuthor()).rejects.toThrow('git error')
    })

    it('should reject on email error', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => {
        if (cmd.includes('user.name')) cb(null, 'John\n')
        else cb(new Error('git error'))
      })

      await expect((command as any).getGitAuthor()).rejects.toThrow('git error')
    })
  })

  describe('updatePackageJson', () => {
    it('should update package.json with provided values', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ name: 'old', description: 'old', version: '0.0.0', author: 'old' })
      )

      await (command as any).updatePackageJson({
        name: 'new',
        description: 'new',
        version: '1.0.0',
        author: 'new'
      })

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"name": "new"')
      )
    })

    it('should preserve existing values when not provided', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'existing',
          description: 'existing',
          version: '0.0.0',
          author: 'existing'
        })
      )

      await (command as any).updatePackageJson({
        name: '',
        description: '',
        version: '',
        author: ''
      })

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"name": "existing"')
      )
    })

    it('should handle JSON parse error', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('invalid json')

      await (command as any).updatePackageJson({
        name: 'test',
        description: 'test',
        version: '1.0.0',
        author: 'test'
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update package.json:',
        expect.any(Error)
      )
    })
  })

  describe('parseDefaults', () => {
    it('should return true', () => {
      const result = command.parseDefaults()
      expect(result).toBe(true)
    })
  })
})
