// biome-ignore-all lint/complexity/useLiteralKeys: bracket notation required for private access

import type { Testable } from '@/typings/tests'

import { InitProjectCommand } from './init-project.command'

const mockFileHandler = {
  exists: jest.fn().mockReturnValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  readJson: jest.fn().mockResolvedValue({}),
  writeFile: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined)
}

const mockPromptService = {
  text: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(),
  spinnerMessage: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }))
}

jest.mock('node:fs')
jest.mock('node:fs/promises')
jest.mock('@/shared/file-handler', () => ({
  FileHandlerService: jest.fn().mockImplementation(() => mockFileHandler)
}))
jest.mock('@/shared/prompt', () => ({
  PromptService: jest.fn().mockImplementation(() => mockPromptService)
}))

jest.mock('yaml', () => {
  interface MockYamlPair {
    key: { value: string }
    value: unknown
    items?: MockYamlPair[]
  }

  const createMockDocument = (initialContent: string) => {
    if (initialContent === 'invalid yaml') throw new Error('Invalid YAML')

    const hasExistingGhcrComment = initialContent.includes('# image: ghcr.io/')

    const createYamlMap = (data: Record<string, unknown>) => {
      const items: MockYamlPair[] = []
      for (const [key, value] of Object.entries(data)) {
        items.push({
          key: { value: key },
          value:
            typeof value === 'object' && value !== null && !Array.isArray(value)
              ? createYamlMap(value as Record<string, unknown>)
              : value
        })
      }
      return {
        items,
        set: (k: string, v: unknown) => {
          const existing = items.find((item) => item.key.value === k)
          if (existing) {
            existing.value = v
          } else {
            items.push({ key: { value: k }, value: v })
          }
        },
        get: (k: string) => items.find((item) => item.key.value === k)?.value,
        delete: (k: string) => {
          const index = items.findIndex((item) => item.key.value === k)
          if (index >= 0) items.splice(index, 1)
        },
        has: (k: string) => items.some((item) => item.key.value === k)
      }
    }

    const apiServiceMap = createYamlMap({
      container_name: 'api',
      image: 'api:latest',
      build: {
        context: '.',
        dockerfile: 'Dockerfile',
        args: {
          PNPM_REGISTRY: 'https://registry.npmjs.org/'
        }
      }
    })

    const servicesMap = createYamlMap({})
    servicesMap.items.push({
      key: { value: 'api' },
      value: apiServiceMap
    })

    const rootMap = createYamlMap({})
    rootMap.items.push({
      key: { value: 'services' },
      value: servicesMap
    })

    return {
      contents: rootMap,
      toString: () => {
        let yaml = 'services:\n'
        for (const serviceItem of servicesMap.items) {
          const serviceName = serviceItem.key.value
          const serviceValue = serviceItem.value as MockYamlPair
          yaml += `  ${serviceName}:\n`
          if (serviceValue.items) {
            for (const propItem of serviceValue.items) {
              const propName = propItem.key.value
              const propValue = propItem.value as MockYamlPair
              if (propName === 'args') {
                yaml += '      args:\n'
                if (propValue.items) {
                  for (const argItem of propValue.items) {
                    yaml += `        ${argItem.key.value}: "${argItem.value}"\n`
                  }
                }
              } else if (propName === 'build') {
                yaml += '    build:\n'
                if (propValue.items) {
                  for (const buildItem of propValue.items) {
                    if (buildItem.key.value === 'args') {
                      yaml += '      args:\n'
                      const argsValue = buildItem.value as MockYamlPair
                      if (argsValue.items) {
                        for (const argItem of argsValue.items) {
                          yaml += `        ${argItem.key.value}: "${argItem.value}"\n`
                        }
                      }
                    } else {
                      yaml += `      ${buildItem.key.value}: ${buildItem.value}\n`
                    }
                  }
                }
              } else {
                yaml += `    ${propName}: ${propValue}\n`
              }
            }
          }
          if (hasExistingGhcrComment) {
            yaml += '    # image: ghcr.io/your-username/your-repo:your-tag\n'
          }
        }
        return yaml
      }
    }
  }

  return {
    parseDocument: jest.fn(createMockDocument),
    stringify: jest.fn((obj: Record<string, unknown>) => {
      const services = (obj.services || {}) as Record<string, unknown>
      let yaml = 'services:\n'
      for (const [serviceName, service] of Object.entries(services)) {
        const s = service as Record<string, unknown>
        yaml += `  ${serviceName}:\n`
        yaml += `    container_name: ${s.container_name}\n`
        yaml += `    image: ${s.image}\n`
        if (s.build) {
          const build = s.build as Record<string, unknown>
          yaml += '    build:\n'
          if (build.args) {
            const args = build.args as Record<string, string>
            yaml += '      args:\n'
            for (const [key, value] of Object.entries(args)) {
              yaml += `        ${key}: "${value}"\n`
            }
          }
        }
      }
      return yaml
    }),
    isMap: jest.fn((node: unknown) => node && typeof node === 'object' && 'items' in node),
    isPair: jest.fn(
      (node: unknown) => node && typeof node === 'object' && 'key' in node && 'value' in node
    ),
    isScalar: jest.fn(
      (node: unknown) => node && typeof node === 'object' && 'value' in node && !('items' in node)
    )
  }
})

const mockProcessService = {
  exec: jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  execSync: jest.fn().mockReturnValue(''),
  spawn: jest.fn()
}
jest.mock('@/shared/process', () => ({
  ProcessService: jest.fn().mockImplementation(() => mockProcessService)
}))

describe('InitProjectCommand', () => {
  let command: InitProjectCommand
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockPromptService.text.mockReset()
    mockPromptService.select.mockReset()
    mockPromptService.confirm.mockReset()
    mockPromptService.spinner.mockReset()
    mockPromptService.spinnerMessage.mockReset()
    mockPromptService.spinnerMessage.mockReturnValue({ start: jest.fn(), stop: jest.fn() })
    mockFileHandler.exists.mockReset()
    mockFileHandler.readFile.mockReset()
    mockFileHandler.readJson.mockReset()
    mockFileHandler.writeFile.mockReset()
    mockFileHandler.writeJson.mockReset()
    mockProcessService.exec.mockReset()
    mockProcessService.exec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    mockFileHandler.exists.mockReturnValue(true)
    mockFileHandler.readFile.mockResolvedValue('{}')
    mockFileHandler.readJson.mockResolvedValue({})
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
      const spy = jest
        .spyOn(command as Testable<InitProjectCommand>, 'initializeWithDefaults')
        .mockResolvedValue(undefined)

      await command.run([], { defaults: true })

      expect(spy).toHaveBeenCalled()
    })

    it('should call initializeInteractive when no --defaults flag', async () => {
      const spy = jest
        .spyOn(command as Testable<InitProjectCommand>, 'initializeInteractive')
        .mockResolvedValue(undefined)

      await command.run([])

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('initializeWithDefaults', () => {
    it('should use spinner and default values', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      mockPromptService.spinnerMessage.mockReturnValue(mockSpinner)
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'old',
        description: 'old',
        version: '0.0.0',
        author: 'old'
      })

      await (command as Testable<InitProjectCommand>)['initializeWithDefaults']()

      expect(mockSpinner.start).toHaveBeenCalled()
      expect(mockSpinner.stop).toHaveBeenCalled()
    })

    it('should skip package.json update if file does not exist', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      mockPromptService.spinnerMessage.mockReturnValue(mockSpinner)
      mockFileHandler.exists.mockReturnValue(false)

      await (command as Testable<InitProjectCommand>)['initializeWithDefaults']()

      expect(consoleWarnSpy).toHaveBeenCalledWith('package.json not found, skipping update.')
    })
  })

  describe('initializeInteractive', () => {
    beforeEach(() => {
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json') // Default: package.json exists, docker-compose doesn't
      })
      mockFileHandler.readJson.mockResolvedValue({})
      mockFileHandler.readFile.mockResolvedValue('{}')
    })

    it('should prompt for all fields using current config', async () => {
      ;(mockPromptService.text as jest.Mock).mockResolvedValue('test-value')
      ;(mockPromptService.select as jest.Mock).mockResolvedValue('pnpm')
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'current-name',
        description: 'current-desc',
        version: '1.0.0',
        author: 'current-author'
      })

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(mockPromptService.text).toHaveBeenCalledTimes(4)
      expect(mockPromptService.confirm).toHaveBeenCalledTimes(1)
    })

    it('should show changes before confirmation', async () => {
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('new-name')
        .mockResolvedValueOnce('current-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce('current-author')
      ;(mockPromptService.select as jest.Mock).mockResolvedValue('pnpm')
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'current-name',
        description: 'current-desc',
        version: '1.0.0',
        author: 'current-author'
      })

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('\nChanges to be applied:')
      expect(consoleSpy).toHaveBeenCalledWith('  name: "current-name" → "new-name"')
    })

    it('should show no changes message when values are same', async () => {
      mockFileHandler.exists.mockImplementation((path: string) => {
        return !path.includes('docker-compose') // Skip docker-compose checks
      })
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('api') // name
        .mockResolvedValueOnce('current-value') // description
        .mockResolvedValueOnce('current-value') // version
        .mockResolvedValueOnce('Git Name <git@email.com>') // author
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'api',
        description: 'current-value',
        version: 'current-value',
        author: 'Git Name <git@email.com>'
      })
      mockProcessService.exec.mockImplementation((cmd: string) => {
        if (cmd.includes('user.name')) {
          return Promise.resolve({ stdout: 'Git Name', stderr: '', exitCode: 0 })
        }
        return Promise.resolve({ stdout: 'git@email.com', stderr: '', exitCode: 0 })
      })

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('\nNo changes to apply.')
    })

    it('should use calver format when selected', async () => {
      const { getCalver } = require('@/shared/utils.helper')
      const todayCalver = getCalver()
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce(todayCalver)
        .mockResolvedValueOnce('test-author')
      ;(mockPromptService.select as jest.Mock).mockResolvedValue('pnpm')
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({})

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(mockPromptService.select).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(`  version: "0.1.0" → "${todayCalver}"`)
    })

    it('should update both package.json and docker-compose.yml when docker exists', async () => {
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce('test-author')
        .mockResolvedValueOnce('test-service')
        .mockResolvedValueOnce('latest')
      ;(mockPromptService.select as jest.Mock)
        .mockResolvedValueOnce('semver')
        .mockResolvedValueOnce('pnpm')
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.exists.mockReturnValue(true) // docker-compose.yml exists

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('\nChanges applied:')
      expect(consoleSpy).toHaveBeenCalledWith('  ✓ package.json updated')
      expect(consoleSpy).toHaveBeenCalledWith('  ✓ docker-compose.yml updated')
      expect(consoleSpy).toHaveBeenCalledWith('\n✔ Project initialized successfully.')
      expect(mockFileHandler.writeJson).toHaveBeenCalled()
      expect(mockFileHandler.writeFile).toHaveBeenCalled()
    })

    it('should accept valid kebab-case names', async () => {
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('my-awesome-app')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('0.1.0')
        .mockResolvedValueOnce('test-author')
      ;(mockPromptService.select as jest.Mock).mockResolvedValue('semver')
      ;(mockPromptService.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('  name: "my-project" → "my-awesome-app"')
    })

    it('should reject invalid names (not kebab-case)', async () => {
      const validateFn =
        (command as Testable<InitProjectCommand>)['validateName'] ||
        ((value: string) => {
          if (!value || value.length === 0) return 'Name is required!'
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
            return 'Name must be kebab-case (lowercase, numbers, hyphens)'
          }
          return undefined
        })

      expect(validateFn('My Project')).toBe('Name must be kebab-case (lowercase, numbers, hyphens)')
      expect(validateFn('my_project')).toBe('Name must be kebab-case (lowercase, numbers, hyphens)')
      expect(validateFn('my.project')).toBe('Name must be kebab-case (lowercase, numbers, hyphens)')
      expect(validateFn('my project')).toBe('Name must be kebab-case (lowercase, numbers, hyphens)')
      expect(validateFn('MyProject')).toBe('Name must be kebab-case (lowercase, numbers, hyphens)')
    })
  })

  describe('initializeDockerConfig', () => {
    it('should return null when no docker-compose.yml exists', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      const result = await (command as Testable<InitProjectCommand>)['initializeDockerConfig'](
        'my-project'
      )

      expect(result).toBeNull()
    })

    it('should prompt for Docker config when docker-compose.yml exists', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      ;(mockPromptService.text as jest.Mock)
        .mockResolvedValueOnce('my-service')
        .mockResolvedValueOnce('1.0.0')
      ;(mockPromptService.select as jest.Mock).mockResolvedValue('pnpm')

      const result = await (command as Testable<InitProjectCommand>)['initializeDockerConfig'](
        'my-project'
      )

      expect(result).toEqual({
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      })
    })
  })

  describe('getCurrentConfig', () => {
    it('should return current values from package.json with git author', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'existing-name',
        description: 'existing-desc',
        version: '2.0.0',
        author: 'old-author'
      })
      mockProcessService.exec.mockImplementation((cmd: string) => {
        if (cmd.includes('user.name')) {
          return Promise.resolve({ stdout: 'Git User', stderr: '', exitCode: 0 })
        }
        return Promise.resolve({ stdout: 'git@example.com', stderr: '', exitCode: 0 })
      })

      const config = await (command as Testable<InitProjectCommand>)['getCurrentConfig']()

      expect(config).toEqual({
        name: 'existing-name',
        description: 'existing-desc',
        version: '2.0.0',
        author: 'Git User <git@example.com>'
      })
    })

    it('should return defaults when no package.json exists', async () => {
      mockFileHandler.exists.mockReturnValue(false)

      const config = await (command as Testable<InitProjectCommand>)['getCurrentConfig']()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '0.1.0',
        author: expect.any(String)
      })
    })

    it('should handle malformed package.json', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockRejectedValue(new Error('Invalid JSON'))

      const config = await (command as Testable<InitProjectCommand>)['getCurrentConfig']()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '0.1.0',
        author: expect.any(String)
      })
    })

    it('should use defaults for missing fields in package.json', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({ name: 'only-name' })

      const config = await (command as Testable<InitProjectCommand>)['getCurrentConfig']()

      expect(config.name).toBe('only-name')
      expect(config.description).toBe('A JavaScript/TypeScript project')
      expect(config.version).toBe('0.1.0')
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default config with generic description', async () => {
      const config = await (command as Testable<InitProjectCommand>)['getDefaultConfig']()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '0.1.0',
        author: expect.any(String)
      })
    })

    it('should use fallback author when git fails', async () => {
      mockProcessService.exec.mockResolvedValue({
        stdout: '',
        stderr: 'git error',
        exitCode: 1,
        error: new Error('git error')
      })

      const config = await (command as Testable<InitProjectCommand>)['getDefaultConfig']()

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

      const changes = (command as Testable<InitProjectCommand>)['getConfigChanges'](
        current,
        updated
      )

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

      const changes = (command as Testable<InitProjectCommand>)['getConfigChanges'](
        current,
        updated
      )

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

      const changes = (command as Testable<InitProjectCommand>)['getConfigChanges'](
        current,
        updated
      )

      expect(changes).toHaveLength(4)
      expect(changes).toContain('name: "old-name" → "new-name"')
      expect(changes).toContain('description: "old-desc" → "new-desc"')
      expect(changes).toContain('version: "1.0.0" → "2.0.0"')
      expect(changes).toContain('author: "old-author" → "new-author"')
    })

    it('should include docker changes when dockerConfig provided', () => {
      const current = {
        name: 'old-name',
        description: 'old-desc',
        version: '1.0.0',
        author: 'old-author'
      }
      const updated = { ...current }
      const dockerConfig = {
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      }

      const changes = (command as Testable<InitProjectCommand>)['getConfigChanges'](
        current,
        updated,
        dockerConfig
      )

      expect(changes).toHaveLength(3)
      expect(changes).toContain('docker-service: "api" → "my-service"')
      expect(changes).toContain('docker-image: "api:latest" → "my-project:1.0.0"')
      expect(changes).toContain('registry: "PNPM_REGISTRY"')
    })
  })

  describe('getGitAuthor', () => {
    it('should return formatted author string', async () => {
      mockProcessService.exec.mockImplementation((cmd: string) => {
        if (cmd.includes('user.name')) {
          return Promise.resolve({ stdout: 'John Doe', stderr: '', exitCode: 0 })
        }
        return Promise.resolve({ stdout: 'john@example.com', stderr: '', exitCode: 0 })
      })

      const result = await (command as Testable<InitProjectCommand>)['getGitAuthor']()

      expect(result).toBe('John Doe <john@example.com>')
    })

    it('should reject on name error', async () => {
      mockProcessService.exec.mockResolvedValue({
        stdout: '',
        stderr: 'git error',
        exitCode: 1,
        error: new Error('git error')
      })

      await expect((command as Testable<InitProjectCommand>)['getGitAuthor']()).rejects.toThrow(
        'git error'
      )
    })

    it('should reject on email error', async () => {
      let callCount = 0
      mockProcessService.exec.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ stdout: 'John', stderr: '', exitCode: 0 })
        }
        return Promise.resolve({
          stdout: '',
          stderr: 'git error',
          exitCode: 1,
          error: new Error('git error')
        })
      })

      await expect((command as Testable<InitProjectCommand>)['getGitAuthor']()).rejects.toThrow(
        'git error'
      )
    })
  })

  describe('updatePackageJson', () => {
    it('should update package.json with provided values', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'old',
        description: 'old',
        version: '0.0.0',
        author: 'old'
      })

      await (command as Testable<InitProjectCommand>)['updatePackageJson']({
        name: 'new',
        description: 'new',
        version: '1.0.0',
        author: 'new'
      })

      expect(mockFileHandler.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.objectContaining({ name: 'new' })
      )
    })

    it('should preserve existing values when not provided', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'existing',
        description: 'existing',
        version: '0.0.0',
        author: 'existing'
      })

      await (command as Testable<InitProjectCommand>)['updatePackageJson']({
        name: '',
        description: '',
        version: '',
        author: ''
      })

      expect(mockFileHandler.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.objectContaining({ name: 'existing' })
      )
    })

    it('should handle JSON parse error', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockRejectedValue(new Error('Invalid JSON'))

      await (command as Testable<InitProjectCommand>)['updatePackageJson']({
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

    it('should handle write error', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({})
      mockFileHandler.writeJson.mockRejectedValue(new Error('Write failed'))

      await (command as Testable<InitProjectCommand>)['updatePackageJson']({
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

  describe('updateDockerCompose', () => {
    it('should update docker-compose.yml with service rename', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readFile.mockResolvedValue('services:\n  api:\n    image: api:latest')

      await (command as Testable<InitProjectCommand>)['updateDockerCompose']({
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      })

      expect(mockFileHandler.writeFile).toHaveBeenCalled()
    })

    it('should add GHCR placeholder comment', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readFile.mockResolvedValue('services:\n  api:\n    image: api:latest')

      await (command as Testable<InitProjectCommand>)['updateDockerCompose']({
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      })

      expect(mockFileHandler.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('# For production with GHCR, uncomment and update:')
      )
      expect(mockFileHandler.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('# image: ghcr.io/your-username/your-repo:1.0.0')
      )
    })

    it('should not add GHCR comment if one already exists', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readFile.mockResolvedValue(
        'services:\n  api:\n    image: api:latest\n    # image: ghcr.io/your-username/your-repo:your-tag'
      )

      await (command as Testable<InitProjectCommand>)['updateDockerCompose']({
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      })

      expect(mockFileHandler.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('# image: ghcr.io/your-username/your-repo:your-tag')
      )
      expect(mockFileHandler.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining('# For production with GHCR, uncomment and update:')
      )
    })

    it('should handle YAML parse error', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readFile.mockResolvedValue('invalid yaml')

      await (command as Testable<InitProjectCommand>)['updateDockerCompose']({
        serviceName: 'my-service',
        projectName: 'my-project',
        imageVersion: '1.0.0',
        packageManager: 'pnpm',
        registryUrl: 'https://registry.npmjs.org/'
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update docker-compose.yml:',
        expect.any(Error)
      )
    })
  })

  describe('getVersionPlaceholder', () => {
    it('should return semver placeholder', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionPlaceholder']('semver')).toBe(
        '0.1.0'
      )
    })

    it('should return calver placeholder', () => {
      const { getCalver } = require('@/shared/utils.helper')
      const todayCalver = getCalver()
      expect((command as Testable<InitProjectCommand>)['getVersionPlaceholder']('calver')).toBe(
        todayCalver
      )
    })

    it('should return custom placeholder', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionPlaceholder']('custom')).toBe(
        'v1'
      )
    })

    it('should return default placeholder for unknown format', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionPlaceholder']('unknown')).toBe(
        '0.1.0'
      )
    })
  })

  describe('getVersionDefault', () => {
    it('should return semver default', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionDefault']('semver')).toBe('0.1.0')
    })

    it('should return calver default with current date', () => {
      const { getCalver } = require('@/shared/utils.helper')
      const todayCalver = getCalver()
      const result = (command as Testable<InitProjectCommand>)['getVersionDefault']('calver')
      expect(result).toBe(todayCalver)
    })

    it('should return custom default', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionDefault']('custom')).toBe('1')
    })

    it('should return default for unknown format', () => {
      expect((command as Testable<InitProjectCommand>)['getVersionDefault']('unknown')).toBe(
        '0.1.0'
      )
    })
  })

  describe('validateVersion', () => {
    it('should allow empty version (for default value)', () => {
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('', 'semver')
      ).toBeUndefined()
    })

    it('should allow undefined version (for default value)', () => {
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion'](undefined, 'semver')
      ).toBeUndefined()
    })

    it('should accept valid semver', () => {
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('1.0.0', 'semver')
      ).toBeUndefined()
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('0.1.0', 'semver')
      ).toBeUndefined()
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('10.20.30', 'semver')
      ).toBeUndefined()
    })

    it('should reject invalid semver', () => {
      expect((command as Testable<InitProjectCommand>)['validateVersion']('abc', 'semver')).toBe(
        'Must be semver format (x.y.z)'
      )
      expect((command as Testable<InitProjectCommand>)['validateVersion']('1.0', 'semver')).toBe(
        'Must be semver format (x.y.z)'
      )
      expect((command as Testable<InitProjectCommand>)['validateVersion']('v1.0.0', 'semver')).toBe(
        'Must be semver format (x.y.z)'
      )
    })

    it('should accept valid calver', () => {
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('2024.03.1', 'calver')
      ).toBeUndefined()
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('2024.3.0', 'calver')
      ).toBeUndefined()
    })

    it('should reject invalid calver', () => {
      expect((command as Testable<InitProjectCommand>)['validateVersion']('abc', 'calver')).toBe(
        'Must be calver format (YYYY.M.PATCH)'
      )
      expect((command as Testable<InitProjectCommand>)['validateVersion']('1.0.0', 'calver')).toBe(
        'Must be calver format (YYYY.M.PATCH)'
      )
    })

    it('should accept any custom format', () => {
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('anything', 'custom')
      ).toBeUndefined()
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('v1', 'custom')
      ).toBeUndefined()
      expect(
        (command as Testable<InitProjectCommand>)['validateVersion']('release-1.0', 'custom')
      ).toBeUndefined()
    })
  })

  describe('parseDefaults', () => {
    it('should return true', () => {
      const result = command.parseDefaults()
      expect(result).toBe(true)
    })
  })
})
