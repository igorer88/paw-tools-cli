import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface AppConfig {
  app: {
    environment: string
    debug: boolean
    secretKey: string
    loggerLevels: string[]
  }
}

export const loadConfig = (): AppConfig => {
  const configPath = join(process.cwd(), 'config', 'config.json')
  const jsonConfig = JSON.parse(readFileSync(configPath, 'utf-8'))

  return {
    app: {
      environment: process.env.NODE_ENV || jsonConfig.app.environment,
      debug: process.env.DEBUG === 'true' || jsonConfig.app.debug,
      secretKey: process.env.APP_SECRET_KEY || jsonConfig.app.secretKey,
      loggerLevels: process.env.APP_LOGGER_LEVELS
        ? process.env.APP_LOGGER_LEVELS.split(',')
        : jsonConfig.app.loggerLevels
    }
  }
}
