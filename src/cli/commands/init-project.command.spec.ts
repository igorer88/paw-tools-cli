// biome-ignore-all lint/complexity/useLiteralKeys: bracket notation required for private access

import * as clack from '@clack/prompts'

import type { Testable } from '@/typings/tests'

import { InitProjectCommand } from './init-project.command'

const mockFileHandler = {
  exists: jest.fn().mockReturnValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  readJson: jest.fn().mockResolvedValue({}),
  writeFile: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined)
}

jest.mock('node:fs')
jest.mock('node:fs/promises')
jest.mock('@/shared/file-handler', () => ({
  FileHandlerService: jest.fn().mockImplementation(() => mockFileHandler)
}))
jest.mock('@clack/prompts', () => ({
  text: jest.fn(),
  confirm: jest.fn(),
  select: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn()
  })),
  cancel: jest.fn(),
  isCancel: jest.fn(() => false)
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

const mockExec = jest.fn()
jest.mock('node:child_process', () => ({
  exec: (...args: unknown[]) => mockExec(...args)
}))

describe('InitProjectCommand', () => {
  let command: InitProjectCommand
  let consoleSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Reset mocks completely and re-apply defaults
    ;(clack.text as jest.Mock).mockReset()
    ;(clack.confirm as jest.Mock).mockReset()
    ;(clack.select as jest.Mock).mockReset()
    ;(clack.spinner as jest.Mock).mockReset()
    ;(clack.cancel as jest.Mock).mockReset()
    ;(clack.isCancel as unknown as jest.Mock).mockReset()
    ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(false)
    ;(clack.spinner as jest.Mock).mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn()
    }))
    mockFileHandler.exists.mockReset()
    mockFileHandler.readFile.mockReset()
    mockFileHandler.readJson.mockReset()
    mockFileHandler.writeFile.mockReset()
    mockFileHandler.writeJson.mockReset()
    // Set default behaviors
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
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      mockFileHandler.exists.mockReturnValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'old',
        description: 'old',
        version: '0.0.0',
        author: 'old'
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      await (command as Testable<InitProjectCommand>)['initializeWithDefaults']()

      expect(mockSpinner.start).toHaveBeenCalled()
      expect(mockSpinner.stop).toHaveBeenCalled()
    })

    it('should skip package.json update if file does not exist', async () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)
      mockFileHandler.exists.mockReturnValue(false)
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

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
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'current-name',
        description: 'current-desc',
        version: '1.0.0',
        author: 'current-author'
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(clack.text).toHaveBeenCalledTimes(4)
      expect(clack.confirm).toHaveBeenCalledTimes(1)
    })

    it('should show changes before confirmation', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('new-name')
        .mockResolvedValueOnce('current-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce('current-author')
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'current-name',
        description: 'current-desc',
        version: '1.0.0',
        author: 'current-author'
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('\nChanges to be applied:')
      expect(consoleSpy).toHaveBeenCalledWith('  name: "current-name" → "new-name"')
    })

    it('should cancel when user rejects confirmation', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')
      ;(clack.confirm as jest.Mock).mockResolvedValue(false)
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation()

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(clack.cancel).toHaveBeenCalledWith('Operation cancelled.')
      expect(_exitSpy).toHaveBeenCalledWith(0)
    })

    it('should cancel on user cancel for name', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
      expect(_exitSpy).toHaveBeenCalledWith(0)
    })

    it('should cancel on user cancel for description', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

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
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

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
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel when confirmation is cancelled', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel on version format selection cancel', async () => {
      ;(clack.text as jest.Mock).mockResolvedValue('test-value')
      ;(clack.select as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeInteractive']()
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should show no changes message when values are same', async () => {
      mockFileHandler.exists.mockImplementation((path: string) => {
        return !path.includes('docker-compose') // Skip docker-compose checks
      })
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('api') // name
        .mockResolvedValueOnce('current-value') // description
        .mockResolvedValueOnce('current-value') // version
        .mockResolvedValueOnce('Git Name <git@email.com>') // author
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({
        name: 'api',
        description: 'current-value',
        version: 'current-value',
        author: 'Git Name <git@email.com>'
      })
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) => {
          if (_cmd.includes('user.name')) cb(null, 'Git Name\n')
          else cb(null, 'git@email.com\n')
        }
      )

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(consoleSpy).toHaveBeenCalledWith('\nNo changes to apply.')
    })

    it('should use calver format when selected', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('2024.03.1')
        .mockResolvedValueOnce('test-author')
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.readJson.mockResolvedValue({})
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(clack.select).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('  version: "0.1.0" → "2024.03.1"')
    })

    it('should update both package.json and docker-compose.yml when docker exists', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('test-name')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('1.0.0')
        .mockResolvedValueOnce('test-author')
        .mockResolvedValueOnce('test-service')
        .mockResolvedValueOnce('latest')
      ;(clack.select as jest.Mock).mockResolvedValueOnce('semver').mockResolvedValueOnce('pnpm')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.exists.mockReturnValue(true) // docker-compose.yml exists
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      const mockSpinner = { start: jest.fn(), stop: jest.fn() }
      ;(clack.spinner as jest.Mock).mockReturnValue(mockSpinner)

      await (command as Testable<InitProjectCommand>)['initializeInteractive']()

      expect(mockSpinner.start).toHaveBeenCalledWith(
        'Updating package.json and docker-compose.yml...'
      )
      expect(mockSpinner.stop).toHaveBeenCalled()
    })

    it('should accept valid kebab-case names', async () => {
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('my-awesome-app')
        .mockResolvedValueOnce('test-desc')
        .mockResolvedValueOnce('0.1.0')
        .mockResolvedValueOnce('test-author')
      ;(clack.select as jest.Mock).mockResolvedValue('semver')
      ;(clack.confirm as jest.Mock).mockResolvedValue(true)
      mockFileHandler.exists.mockImplementation((path: string) => {
        return path.includes('package.json')
      })
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

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
      ;(clack.text as jest.Mock).mockResolvedValueOnce('my-service').mockResolvedValueOnce('1.0.0')
      ;(clack.select as jest.Mock).mockResolvedValue('pnpm')

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

    it('should cancel on service name cancel', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      ;(clack.text as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockReturnValue(true)
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeDockerConfig']('my-project')
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel on image version cancel', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      ;(clack.text as jest.Mock)
        .mockResolvedValueOnce('my-service')
        .mockResolvedValueOnce(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeDockerConfig']('my-project')
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
    })

    it('should cancel on package manager cancel', async () => {
      mockFileHandler.exists.mockReturnValue(true)
      ;(clack.text as jest.Mock).mockResolvedValueOnce('my-service').mockResolvedValueOnce('1.0.0')
      ;(clack.select as jest.Mock).mockResolvedValue(Symbol('cancel'))
      ;(clack.isCancel as unknown as jest.Mock).mockImplementation(
        (val: unknown) => typeof val === 'symbol'
      )
      const _exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit')
      }) as (code?: number) => never)

      await expect(
        (command as Testable<InitProjectCommand>)['initializeDockerConfig']('my-project')
      ).rejects.toThrow('process.exit')

      expect(clack.cancel).toHaveBeenCalled()
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
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) => {
          if (_cmd.includes('user.name')) cb(null, 'Git User\n')
          else cb(null, 'git@example.com\n')
        }
      )

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
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

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
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

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
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      const config = await (command as Testable<InitProjectCommand>)['getCurrentConfig']()

      expect(config.name).toBe('only-name')
      expect(config.description).toBe('A JavaScript/TypeScript project')
      expect(config.version).toBe('0.1.0')
    })
  })

  describe('getDefaultConfig', () => {
    it('should return default config with generic description', async () => {
      mockExec.mockImplementation((_cmd: string, cb: (...args: unknown[]) => unknown) =>
        cb(null, 'name\nemail\n')
      )

      const config = await (command as Testable<InitProjectCommand>)['getDefaultConfig']()

      expect(config).toEqual({
        name: 'my-project',
        description: 'A JavaScript/TypeScript project',
        version: '0.1.0',
        author: expect.any(String)
      })
    })

    it('should use fallback author when git fails', async () => {
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) =>
          cb(new Error('git error'))
      )

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
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) => {
          if (_cmd.includes('user.name')) cb(null, 'John Doe\n')
          else cb(null, 'john@example.com\n')
        }
      )

      const result = await (command as Testable<InitProjectCommand>)['getGitAuthor']()

      expect(result).toBe('John Doe <john@example.com>')
    })

    it('should reject on name error', async () => {
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) =>
          cb(new Error('git error'))
      )

      await expect((command as Testable<InitProjectCommand>)['getGitAuthor']()).rejects.toThrow(
        'git error'
      )
    })

    it('should reject on email error', async () => {
      mockExec.mockImplementation(
        (_cmd: string, cb: (err: Error | null, stdout?: string) => void) => {
          if (_cmd.includes('user.name')) cb(null, 'John\n')
          else cb(new Error('git error'))
        }
      )

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
      expect((command as Testable<InitProjectCommand>)['getVersionPlaceholder']('calver')).toBe(
        '2024.03.1'
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
      const result = (command as Testable<InitProjectCommand>)['getVersionDefault']('calver')
      expect(result).toMatch(/^\d{4}\.\d{2}\.0$/)
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
