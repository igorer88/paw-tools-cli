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
    it('should prompt for all fields', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('{}')
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeInteractive()

      expect(clack.text).toHaveBeenCalledTimes(4)
    })

    it('should cancel on user cancel for name', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as any).initializeInteractive()

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
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as any).initializeInteractive()

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
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as any).initializeInteractive()

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
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as any).initializeInteractive()

      expect(clack.cancel).toHaveBeenCalled()
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
