export interface FileReader {
  readFile(path: string, encoding?: BufferEncoding): Promise<string>
  readJson<T>(path: string): Promise<T>
}
