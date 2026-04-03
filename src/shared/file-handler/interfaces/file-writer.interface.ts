export interface FileWriter {
  writeFile(path: string, content: string): Promise<void>
  writeJson(path: string, data: unknown): Promise<void>
}
