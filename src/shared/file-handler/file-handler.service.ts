import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Injectable } from '@nestjs/common'
import { parse, stringify } from 'yaml'

import type { FileReader, FileSystem, FileWriter, YamlHandler } from './interfaces'

/**
 * Validates that a path doesn't contain path traversal sequences
 * @throws Error if path contains traversal attempts
 */
function validatePath(path: string, basePath?: string): string {
  // Always block ".." path traversal
  if (path.includes('..')) {
    // If basePath is set, use it; otherwise use cwd
    const normalizedBase = resolve(basePath || process.cwd())
    const resolved = resolve(path)
    // Check if .. escapes the base directory
    if (!resolved.startsWith(normalizedBase)) {
      throw new Error(`Path traversal detected: "${path}"`)
    }
  }

  // If base directory is set, enforce it
  if (basePath) {
    const normalizedPath = resolve(basePath, path)
    const normalizedBase = resolve(basePath)

    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error(`Path traversal detected: "${path}"`)
    }

    return normalizedPath
  }

  // No base directory - allow absolute paths (will fail naturally if file doesn't exist)
  return resolve(path)
}

/**
 * Set a base directory for all file operations (optional security boundary)
 */
let baseDirectory: string | undefined

export function setBaseDirectory(dir: string | undefined): void {
  baseDirectory = dir ? resolve(dir) : undefined
}

export function getBaseDirectory(): string | undefined {
  return baseDirectory
}

@Injectable()
export class FileHandlerService implements FileReader, FileWriter, FileSystem, YamlHandler {
  async readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const safePath = validatePath(path, baseDirectory)
    return readFile(safePath, encoding)
  }

  async readJson<T>(path: string): Promise<T> {
    const content = await this.readFile(path)
    return JSON.parse(content) as T
  }

  async writeFile(path: string, content: string): Promise<void> {
    const safePath = validatePath(path, baseDirectory)
    await writeFile(safePath, content, 'utf-8')
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
    const safePath = validatePath(path, baseDirectory)
    return existsSync(safePath)
  }

  async ensureDir(path: string): Promise<void> {
    const safePath = validatePath(path, baseDirectory)
    if (!existsSync(safePath)) {
      mkdirSync(safePath, { recursive: true })
    }
  }

  async createSymlink(source: string, target: string, type: 'dir' | 'file'): Promise<void> {
    // Validate target path
    const safeTarget = validatePath(target, baseDirectory)

    const dir = dirname(safeTarget)
    await this.ensureDir(dir)

    // Validate source exists and is accessible
    if (!existsSync(source)) {
      throw new Error(`Symlink source does not exist: "${source}"`)
    }

    const { symlink } = await import('node:fs/promises')
    await symlink(source, safeTarget, type)
  }
}
