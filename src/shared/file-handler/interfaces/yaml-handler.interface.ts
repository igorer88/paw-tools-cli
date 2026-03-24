export interface YamlHandler {
  readYaml<T>(path: string): Promise<T>
  writeYaml(path: string, data: unknown): Promise<void>
}
