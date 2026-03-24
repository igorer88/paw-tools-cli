import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Injectable } from '@nestjs/common'
import { parse, stringify } from 'yaml'

import type { FileReader, FileSystem, FileWriter, YamlHandler } from './interfaces'

@Injectable()
export class FileHandlerService implements FileReader, FileWriter, FileSystem, YamlHandler {
  async readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return readFile(path, encoding)
  }

  async readJson<T>(path: string): Promise<T> {
    const content = await this.readFile(path)
    return JSON.parse(content) as T
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeFile(path, content, 'utf-8')
  }

  async writeJson(path: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2)
    await this.writeFile(path, content)
  }

  async readYaml<T>(path: string): Promise<T> {
    const content = await this.readFile(path)
    return parse(content) as T
  }

  async writeYaml(path: string, data: unknown): Promise<void> {
    const content = stringify(data)
    await this.writeFile(path, content)
  }

  exists(path: string): boolean {
    return existsSync(path)
  }

  async ensureDir(path: string): Promise<void> {
    if (!this.exists(path)) {
      mkdirSync(path, { recursive: true })
    }
  }

  async createSymlink(source: string, target: string, type: 'dir' | 'file'): Promise<void> {
    const dir = dirname(target)
    await this.ensureDir(dir)
    const { symlink } = await import('node:fs/promises')
    await symlink(source, target, type)
  }
}
