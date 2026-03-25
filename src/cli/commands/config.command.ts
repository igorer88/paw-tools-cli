import { join } from 'node:path'

import { Command, CommandRunner, Option } from 'nest-commander'

import { ConsoleService } from '@/shared/console'
import { ExitCodes } from '@/shared/exit-codes'
import { FileHandlerService } from '@/shared/file-handler'

interface ConfigCommandOptions {
  config?: string
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

  @Option({
    flags: '-c, --config <path>',
    description: 'Path to custom config file'
  })
  parseConfig(val: string): string {
    return val
  }

  async run(_passedParam: string[], options?: ConfigCommandOptions): Promise<void> {
    try {
      const configPath = this.resolveConfigPath(options?.config)
      const config = await this.loadConfig(configPath)
      this.validateConfig(config)
      this.consoleService.success(`Configuration loaded successfully: ${configPath}`)
    } catch (error) {
      this.consoleService.error('Error:', error)
      process.exit(ExitCodes.ERROR)
    }
  }
}
