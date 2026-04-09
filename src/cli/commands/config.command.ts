import { dirname, join } from 'node:path'

import { Command, CommandRunner, Option } from 'nest-commander'
import { DEFAULT_CONFIG } from '@/shared/config/default-config'
import { ConsoleService } from '@/shared/console'
import { ExitCodes } from '@/shared/exit-codes'
import { FileHandlerService } from '@/shared/file-handler'

interface ConfigCommandOptions {
  config?: string
  export?: string
  list?: boolean
  get?: string
  set?: string
  validate?: boolean
}

@Command({
  name: 'config',
  description: 'Load and validate CLI configuration'
})
export class ConfigCommand extends CommandRunner {
  private readonly fileHandler: FileHandlerService
  private readonly consoleService: ConsoleService

  constructor() {
    super()
    this.fileHandler = new FileHandlerService()
    this.consoleService = new ConsoleService()
  }

  private resolveConfigPath(customPath?: string): string {
    if (customPath) return customPath
    if (process.env.PAW_CONFIG) return process.env.PAW_CONFIG
    return join(process.cwd(), 'config', 'config.json')
  }

  private async loadConfig(path: string): Promise<Record<string, unknown>> {
    if (!this.fileHandler.exists(path)) {
      throw new Error(`Config file not found: ${path}`)
    }

    return this.fileHandler.readJson<Record<string, unknown>>(path)
  }

  private validateConfig(config: Record<string, unknown>): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be a valid JSON object')
    }
  }

  private async exportConfig(path: string): Promise<void> {
    if (this.fileHandler.exists(path)) {
      throw new Error(`Config file already exists: ${path}`)
    }

    const dir = dirname(path)
    await this.fileHandler.ensureDir(dir)
    await this.fileHandler.writeJson(path, DEFAULT_CONFIG)
    this.consoleService.success(`Config exported to: ${path}`)
  }

  private getConfigValue(config: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.')
    let current: unknown = config

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k]
      } else {
        return undefined
      }
    }

    return current
  }

  private setConfigValue(
    config: Record<string, unknown>,
    key: string,
    value: string
  ): Record<string, unknown> {
    const keys = key.split('.')
    const result = JSON.parse(JSON.stringify(config))
    let current: Record<string, unknown> = result

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k] as Record<string, unknown>
    }

    const lastKey = keys[keys.length - 1]
    const parsedValue = this.parseValue(value)
    current[lastKey] = parsedValue

    return result
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (value === 'undefined') return undefined
    if (!isNaN(Number(value)) && value.trim() !== '') return Number(value)
    return value
  }

  private buildMergedConfig(config: Record<string, unknown>): Record<string, unknown> {
    const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG))

    const merge = (target: Record<string, unknown>, source: Record<string, unknown>): void => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {}
          }
          merge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
        } else {
          target[key] = source[key]
        }
      }
    }

    merge(merged as Record<string, unknown>, config)

    return merged
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  private async listConfig(configPath: string, config: Record<string, unknown>): Promise<void> {
    const mergedConfig = this.buildMergedConfig(config)

    this.consoleService.info(`Config file: ${configPath}`)
    this.consoleService.log('')

    const printSection = (section: string, obj: unknown, prefix = ''): void => {
      this.consoleService.info(`${prefix}${section}:`)
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          const valueStr = this.formatValue(value)
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            this.consoleService.log(`  ${key}:`)
            for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
              this.consoleService.log(`    ${subKey}: ${this.formatValue(subValue)}`)
            }
          } else {
            this.consoleService.log(`  ${key}: ${valueStr}`)
          }
        }
      }
    }

    printSection('app', mergedConfig['app'])
  }

  private async getConfigValueByKey(
    key: string,
    _configPath: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const mergedConfig = this.buildMergedConfig(config)
    const value = this.getConfigValue(mergedConfig, key)

    if (value === undefined) {
      throw new Error(`Key not found: ${key}`)
    }

    this.consoleService.log(this.formatValue(value))
  }

  private async setConfigValueInFile(
    key: string,
    value: string,
    configPath: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const updatedConfig = this.setConfigValue(config, key, value)
    await this.fileHandler.writeJson(configPath, updatedConfig)
    this.consoleService.success(`Updated ${key} in ${configPath}`)
  }

  @Option({
    flags: '-c, --config <path>',
    description: 'Path to custom config file'
  })
  parseConfig(val: string): string {
    return val
  }

  @Option({
    flags: '-e, --export [path]',
    description: 'Export default config (default: ./config/config.json)'
  })
  parseExport(val?: string): string {
    const path = typeof val === 'string' ? val : undefined
    return path || join(process.cwd(), 'config', 'config.json')
  }

  @Option({
    flags: '-l, --list',
    description: 'List all configuration values'
  })
  parseList(): boolean | undefined {
    return true
  }

  @Option({
    flags: '-g, --get <key>',
    description: 'Get a specific config value (e.g., app.logger.level)'
  })
  parseGet(val: string): string {
    return val
  }

  @Option({
    flags: '-s, --set <key=value>',
    description: 'Set a config value (e.g., app.logger.level=debug)'
  })
  parseSet(val: string): string {
    return val
  }

  @Option({
    flags: '-v, --validate',
    description: 'Validate config without loading'
  })
  parseValidate(): boolean | undefined {
    return true
  }

  async run(_passedParam: string[], options?: ConfigCommandOptions): Promise<void> {
    try {
      if (options?.export !== undefined) {
        const exportPath =
          typeof options.export === 'string'
            ? options.export
            : join(process.cwd(), 'config', 'config.json')
        await this.exportConfig(exportPath)
        return
      }

      const configPath = this.resolveConfigPath(options?.config)

      if (
        options?.list !== undefined ||
        options?.get ||
        options?.set ||
        options?.validate !== undefined
      ) {
        const config = await this.loadConfig(configPath)
        this.validateConfig(config)

        if (options?.validate !== undefined) {
          this.consoleService.success(`Configuration is valid: ${configPath}`)
          return
        }

        if (options?.list !== undefined) {
          await this.listConfig(configPath, config)
          return
        }

        if (options?.get) {
          await this.getConfigValueByKey(options.get, configPath, config)
          return
        }

        if (options?.set) {
          const [key, value] = options.set.split('=')
          if (!key || value === undefined) {
            throw new Error('Invalid --set format. Use: --set key=value')
          }
          await this.setConfigValueInFile(key, value, configPath, config)
          return
        }
      }

      const config = await this.loadConfig(configPath)
      this.validateConfig(config)
      this.consoleService.success(`Configuration loaded successfully: ${configPath}`)
    } catch (error) {
      this.consoleService.error('Error:', error)
      process.exit(ExitCodes.ERROR)
    }
  }
}
