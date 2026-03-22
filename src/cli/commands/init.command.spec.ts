import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { InitCommand } from './init.command'

jest.mock('node:fs')
jest.mock('node:child_process', () => ({
  exec: jest.fn((cmd, callback) => callback(null, 'user\nuser@example.com\n'))
}))

describe('InitCommand', () => {
  let command: InitCommand
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    command = new InitCommand()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('should be defined', () => {
    expect(command).toBeDefined()
  })

  describe('initializeWithDefaults', () => {
    it('should use default values', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'old-name',
          description: 'old-desc',
          version: '0.0.0',
          author: 'old-author'
        })
      )

      await (command as any).initializeWithDefaults()

      expect(consoleSpy).toHaveBeenCalledWith('Using defaults...')
      expect(consoleSpy).toHaveBeenCalledWith('Project initialized successfully.')
    })

    it('should skip package.json update if file does not exist', async () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)

      await (command as any).initializeWithDefaults()

      expect(consoleWarnSpy).toHaveBeenCalledWith('package.json not found, skipping update.')
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default config values', async () => {
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
      const mockPackageJson = {
        name: 'old-name',
        description: 'old-desc',
        version: '0.0.0',
        author: 'old-author'
      }

      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson))

      const config = {
        name: 'new-name',
        description: 'new-desc',
        version: '1.0.0',
        author: 'new-author'
      }

      await (command as any).updatePackageJson(config)

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"name": "new-name"')
      )
    })

    it('should preserve existing values when not provided', async () => {
      const mockPackageJson = {
        name: 'existing-name',
        description: 'existing-desc',
        version: '0.0.0',
        author: 'existing-author'
      }

      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson))

      const config = {
        name: '',
        description: '',
        version: '',
        author: ''
      }

      await (command as any).updatePackageJson(config)

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"name": "existing-name"')
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
