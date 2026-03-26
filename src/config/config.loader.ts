import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ConsoleService } from '@/shared/console'

export interface AppConfig {
  app: {
    environment: string
    secretKey: string
    logger: {
      level: string
      tag: boolean
      date: boolean
      format: string
    }
  }
}

const DEFAULT_CONFIG: AppConfig = {
  app: {
    environment: 'development',
    secretKey: '',
    logger: {
      level: 'debug',
      tag: false,
      date: false,
      format: 'pretty'
    }
  }
}

export const loadConfig = (): AppConfig => {
  const configPath = join(process.cwd(), 'config', 'config.json')

  if (!existsSync(configPath)) {
    const logger = new ConsoleService({
      level: DEFAULT_CONFIG.app.logger.level,
      tag: DEFAULT_CONFIG.app.logger.tag,
      date: DEFAULT_CONFIG.app.logger.date,
      format: DEFAULT_CONFIG.app.logger.format
    })
    logger.debug(`Checking for config file at: ${configPath}`)
    logger.debug('Config file not found, using defaults')
    return applyEnvOverrides(DEFAULT_CONFIG)
  }

  const jsonConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as AppConfig
  const config = applyEnvOverrides(jsonConfig)

  const logger = new ConsoleService({
    level: config.app.logger.level,
    tag: config.app.logger.tag,
    date: config.app.logger.date,
    format: config.app.logger.format
  })
  logger.debug(`Checking for config file at: ${configPath}`)
  logger.debug('Config file found, loading...')

  return config
}

function applyEnvOverrides(config: AppConfig): AppConfig {
  return {
    app: {
      environment: process.env.NODE_ENV || config.app.environment,
      secretKey: process.env.APP_SECRET_KEY || config.app.secretKey,
      logger: {
        level: process.env.APP_LOGGER_LEVELS || config.app.logger.level,
        tag: process.env.APP_LOGGER_TAG === 'true' || config.app.logger.tag,
        date: process.env.APP_LOGGER_DATE === 'true' || config.app.logger.date,
        format: process.env.APP_LOGGER_FORMAT || config.app.logger.format
      }
    }
  }
}
