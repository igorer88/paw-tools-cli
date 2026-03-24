import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { FileHandlerService } from './file-handler.service'

describe('FileHandlerService', () => {
  const testDir = join(process.cwd(), 'test-temp')
  const testFile = join(testDir, 'test.json')
  const testYamlFile = join(testDir, 'test.yaml')
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
})
