import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Command, CommandRunner, Option } from 'nest-commander'

interface ConfigCommandOptions {
  config?: string
}

@Command({
  name: 'config',
  description: 'Load and validate CLI configuration'
})
export class ConfigCommand extends CommandRunner {
  async run(_passedParam: string[], options?: ConfigCommandOptions): Promise<void> {
    const configPath = this.resolveConfigPath(options?.config)
    const config = this.loadConfig(configPath)
    this.validateConfig(config)
    console.log('Configuration loaded successfully:', configPath)
  }

  private resolveConfigPath(customPath?: string): string {
    if (customPath) return customPath
    if (process.env.PAW_CONFIG) return process.env.PAW_CONFIG
    return join(process.cwd(), 'config', 'config.json')
  }

  private loadConfig(path: string): Record<string, unknown> {
    if (!existsSync(path)) {
      throw new Error(`Config file not found: ${path}`)
    }

    const content = readFileSync(path, 'utf-8')

    try {
      return JSON.parse(content)
    } catch {
      throw new Error(`Invalid JSON in config file: ${path}`)
    }
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
}
