import { lstatSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { FileHandlerService, getBaseDirectory, setBaseDirectory } from './file-handler.service'

describe('FileHandlerService', () => {
  const testDir = join(process.cwd(), 'test-temp')
  const testFile = join(testDir, 'test.json')
  const testYamlFile = join(testDir, 'test.yaml')
  const testSymlinkFile = join(testDir, 'test-symlink.json')
  const testSymlinkDir = join(testDir, 'test-symlink-dir')
  const service = new FileHandlerService()

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    if (service.exists(testFile)) {
      rmSync(testFile)
    }
    if (service.exists(testYamlFile)) {
      rmSync(testYamlFile)
    }
    if (service.exists(testSymlinkFile)) {
      try {
        unlinkSync(testSymlinkFile)
      } catch {
        /* ignore */
      }
    }
    if (service.exists(testSymlinkDir)) {
      try {
        unlinkSync(testSymlinkDir)
      } catch {
        /* ignore */
      }
    }
  })

  describe('exists', () => {
    it('should return false for non-existent file', () => {
      expect(service.exists(join(testDir, 'non-existent.json'))).toBe(false)
    })

    it('should return true for existing file', () => {
      writeFileSync(testFile, '{}')
      expect(service.exists(testFile)).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'Hello, World!'
      writeFileSync(testFile, content)
      const result = await service.readFile(testFile)
      expect(result).toBe(content)
    })
  })

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const content = 'Test content'
      await service.writeFile(testFile, content)
      expect(service.exists(testFile)).toBe(true)
    })
  })

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const data = { name: 'test', value: 42 }
      writeFileSync(testFile, JSON.stringify(data))
      const result = await service.readJson<typeof data>(testFile)
      expect(result).toEqual(data)
    })
  })

  describe('writeJson', () => {
    it('should write object as JSON', async () => {
      const data = { name: 'test', value: 42 }
      await service.writeJson(testFile, data)
      const content = await service.readFile(testFile)
      expect(JSON.parse(content)).toEqual(data)
    })
  })

  describe('readYaml', () => {
    it('should read and parse YAML file', async () => {
      const yamlContent = 'name: test\nvalue: 42'
      writeFileSync(testYamlFile, yamlContent)
      const result = await service.readYaml<{ name: string; value: number }>(testYamlFile)
      expect(result).toEqual({ name: 'test', value: 42 })
    })
  })

  describe('writeYaml', () => {
    it('should write object as YAML', async () => {
      const data = { name: 'test', value: 42 }
      await service.writeYaml(testYamlFile, data)
      expect(service.exists(testYamlFile)).toBe(true)
    })
  })

  describe('ensureDir', () => {
    it('should create directory if not exists', async () => {
      const newDir = join(testDir, 'nested', 'dir')
      await service.ensureDir(newDir)
      expect(service.exists(newDir)).toBe(true)
    })

    it('should not throw if directory exists', async () => {
      await expect(service.ensureDir(testDir)).resolves.not.toThrow()
    })
  })

  describe('createSymlink', () => {
    it('should create file symlink', async () => {
      writeFileSync(testFile, '{}')

      await service.createSymlink(testFile, testSymlinkFile, 'file')

      expect(service.exists(testSymlinkFile)).toBe(true)
      expect(lstatSync(testSymlinkFile).isSymbolicLink()).toBe(true)
    })

    it('should create directory symlink', async () => {
      const nestedDir = join(testDir, 'nested-source')
      mkdirSync(nestedDir, { recursive: true })

      await service.createSymlink(nestedDir, testSymlinkDir, 'dir')

      expect(service.exists(testSymlinkDir)).toBe(true)
      expect(lstatSync(testSymlinkDir).isSymbolicLink()).toBe(true)
    })
  })

  describe('path validation', () => {
    afterEach(() => {
      setBaseDirectory(undefined)
    })

    describe('setBaseDirectory and getBaseDirectory', () => {
      it('should set and get base directory', () => {
        setBaseDirectory('/test/path')
        expect(getBaseDirectory()).toBe('/test/path')
      })

      it('should return undefined when not set', () => {
        setBaseDirectory(undefined)
        expect(getBaseDirectory()).toBeUndefined()
      })

      it('should resolve relative paths to absolute', () => {
        setBaseDirectory('/test')
        expect(getBaseDirectory()).toBe('/test')
      })
    })

    describe('readFile with path validation', () => {
      it('should throw on path traversal attempt', async () => {
        setBaseDirectory(testDir)
        await expect(service.readFile('../package.json')).rejects.toThrow('Path traversal detected')
      })

      it('should allow valid paths within base directory', async () => {
        setBaseDirectory(testDir)
        writeFileSync(testFile, 'test content')
        const content = await service.readFile('test.json')
        expect(content).toBe('test content')
      })
    })

    describe('writeFile with path validation', () => {
      it('should throw on path traversal attempt', async () => {
        setBaseDirectory(testDir)
        await expect(service.writeFile('../../etc/passwd', 'malicious')).rejects.toThrow(
          'Path traversal detected'
        )
      })

      it('should allow valid paths within base directory', async () => {
        setBaseDirectory(testDir)
        await service.writeFile('test.json', 'test content')
        expect(service.exists(join(testDir, 'test.json'))).toBe(true)
      })
    })

    describe('exists with path validation', () => {
      it('should throw on path traversal attempt', () => {
        setBaseDirectory(testDir)
        expect(() => service.exists('../secret.txt')).toThrow('Path traversal detected')
      })

      it('should allow valid paths within base directory', () => {
        writeFileSync(testFile, '{}')
        setBaseDirectory(testDir)
        expect(service.exists('test.json')).toBe(true)
      })
    })

    describe('createSymlink with path validation', () => {
      it('should throw on path traversal in target', async () => {
        setBaseDirectory(testDir)
        const validSource = join(testDir, 'valid-source')
        writeFileSync(validSource, 'test')

        await expect(service.createSymlink(validSource, '../../target', 'file')).rejects.toThrow(
          'Path traversal detected'
        )
      })

      it('should throw when symlink source does not exist', async () => {
        setBaseDirectory(testDir)
        await expect(service.createSymlink('/non/existent', 'test-link', 'file')).rejects.toThrow(
          'Symlink source does not exist'
        )
      })
    })

    describe('path validation edge cases', () => {
      it('should allow absolute paths without base directory', () => {
        setBaseDirectory(undefined)
        expect(() => service.exists(testFile)).not.toThrow()
      })

      it('should throw path traversal attempt when .. escapes base', () => {
        // Set base to testDir, then try to escape to parent
        setBaseDirectory(testDir)
        // This should trigger the "Path traversal detected" error
        expect(() => service.exists('../package.json')).toThrow('Path traversal detected')
      })

      it('should throw when absolute path is outside base', () => {
        // Set base to testDir, try to access absolute path outside
        setBaseDirectory(testDir)
        // /tmp is outside testDir, should throw
        expect(() => service.exists('/tmp/malicious')).toThrow('Path traversal detected')
      })
    })
  })
})
