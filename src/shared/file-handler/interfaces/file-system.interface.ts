export interface FileSystem {
  exists(path: string): boolean
  ensureDir(path: string): Promise<void>
  createSymlink(source: string, target: string, type: 'dir' | 'file'): Promise<void>
}
