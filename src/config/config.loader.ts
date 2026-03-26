import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ConsoleService } from '@/shared/console'

export interface AppConfig {
  app: {
    environment: string
    debug: boolean
    secretKey: string
    loggerLevel: string
  }
}

const DEFAULT_CONFIG: AppConfig = {
  app: {
    environment: 'development',
    debug: false,
    secretKey: '',
    loggerLevel: 'debug'
  }
}

export const loadConfig = (): AppConfig => {
  const logger = new ConsoleService()
  const configPath = join(process.cwd(), 'config', 'config.json')

  logger.debug(`Checking for config file at: ${configPath}`)

  if (!existsSync(configPath)) {
    logger.debug('Config file not found, using defaults')
    return applyEnvOverrides(DEFAULT_CONFIG)
  }

  logger.debug('Config file found, loading...')
  const jsonConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as AppConfig

  return applyEnvOverrides(jsonConfig)
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  return {
    app: {
      environment: process.env.NODE_ENV || config.app.environment,
      debug: process.env.DEBUG === 'true' || config.app.debug,
      secretKey: process.env.APP_SECRET_KEY || config.app.secretKey,
      loggerLevel: process.env.APP_LOGGER_LEVELS || config.app.loggerLevel
    }
  }
}
