import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import readline from 'node:readline'

import { InitCommand } from './init.command'

jest.mock('node:fs')
jest.mock('node:readline')

const mockExec = jest.fn()
jest.mock('node:child_process', () => ({
  exec: (...args: any[]) => mockExec(...args)
}))

describe('InitCommand', () => {
  let command: InitCommand
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  let mockQuestion: jest.Mock
  let mockClose: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    command = new InitCommand()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    mockQuestion = jest.fn()
    mockClose = jest.fn()
    ;(readline.createInterface as jest.Mock).mockReturnValue({
      question: mockQuestion,
      close: mockClose
    })
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
    it('should use default values', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({ name: 'old', description: 'old', version: '0.0.0', author: 'old' })
      )
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeWithDefaults()

      expect(consoleSpy).toHaveBeenCalledWith('Using defaults...')
      expect(consoleSpy).toHaveBeenCalledWith('Project initialized successfully.')
    })

    it('should skip package.json update if file does not exist', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      await (command as any).initializeWithDefaults()

      expect(consoleWarnSpy).toHaveBeenCalledWith('package.json not found, skipping update.')
    })
  })

  describe('initializeInteractive', () => {
    it('should create readline interface', async () => {
      jest.spyOn(command as any, 'promptForConfig').mockResolvedValue({
        name: 'test',
        description: 'test',
        version: '1.0.0',
        author: 'test'
      })
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('{}')

      await (command as any).initializeInteractive()

      expect(readline.createInterface).toHaveBeenCalled()
    })

    it('should close readline after completion', async () => {
      jest.spyOn(command as any, 'promptForConfig').mockResolvedValue({
        name: 'test',
        description: 'test',
        version: '1.0.0',
        author: 'test'
      })
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue('{}')

      await (command as any).initializeInteractive()

      expect(mockClose).toHaveBeenCalled()
    })

    it('should close readline on error', async () => {
      jest.spyOn(command as any, 'promptForConfig').mockRejectedValue(new Error('test error'))

      await expect((command as any).initializeInteractive()).rejects.toThrow('test error')
      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('promptForConfig', () => {
    it('should use git author as default', async () => {
      ;(command as any).rl = { question: mockQuestion }
      mockExec.mockImplementation((cmd: string, cb: Function) => {
        if (cmd.includes('user.name')) cb(null, 'John\n')
        else cb(null, 'john@example.com\n')
      })
      mockQuestion.mockImplementation((q: string, cb: Function) => cb(''))

      const config = await (command as any).promptForConfig()

      expect(config.author).toBe('John <john@example.com>')
    })

    it('should handle git author error with fallback', async () => {
      ;(command as any).rl = { question: mockQuestion }
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error('git error')))
      mockQuestion.mockImplementation((q: string, cb: Function) => cb(''))

      const config = await (command as any).promptForConfig()

      expect(config.author).toBe('Unknown <unknown@example.com>')
    })
  })

  describe('askQuestion', () => {
    it('should return default value when input is empty', async () => {
      ;(command as any).rl = { question: mockQuestion }
      mockQuestion.mockImplementation((q: string, cb: Function) => cb(''))

      const result = await (command as any).askQuestion('Test?', 'default')

      expect(result).toBe('default')
    })

    it('should return user input when provided', async () => {
      ;(command as any).rl = { question: mockQuestion }
      mockQuestion.mockImplementation((q: string, cb: Function) => cb('user-input'))

      const result = await (command as any).askQuestion('Test?', 'default')

      expect(result).toBe('user-input')
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

  describe('getDefaultConfig', () => {
    it('should return default config values', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, 'name\nemail\n'))

      const config = await (command as any).getDefaultConfig()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A NestJS project',
        version: '1.0.0',
        author: expect.any(String)
      })
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

  describe('checkPackageManagerInstalled', () => {
    it('should return true when installed', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null))

      const result = await (command as any).checkPackageManagerInstalled('pnpm')

      expect(result).toBe(true)
    })

    it('should return false when not installed', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error('not found')))

      const result = await (command as any).checkPackageManagerInstalled('yarn')

      expect(result).toBe(false)
    })
  })

  describe('installDependencies', () => {
    it('should remove pnpm-lock.yaml when not using pnpm', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null))

      await (command as any).installDependencies('npm')

      expect(unlinkSync).toHaveBeenCalledWith('pnpm-lock.yaml')
    })

    it('should not remove pnpm-lock.yaml when using pnpm', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null))

      await (command as any).installDependencies('pnpm')

      expect(unlinkSync).not.toHaveBeenCalled()
    })

    it('should reject on error', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(new Error('install error')))

      await expect((command as any).installDependencies()).rejects.toThrow('install error')
    })

    it('should reject on stderr', async () => {
      mockExec.mockImplementation((cmd: string, cb: Function) => cb(null, null, 'warning'))

      await expect((command as any).installDependencies()).rejects.toThrow('warning')
    })
  })

  describe('parseDefaults', () => {
    it('should return true', () => {
      const result = command.parseDefaults()
      expect(result).toBe(true)
    })
  })
})
