import { type ConsolaInstance, createConsola } from 'consola'

import { LogLevels } from '@/config/constants/logger.constants'
import type { Logger } from './interfaces'

function parseLogLevel(level: string | undefined): number {
  if (!level) return LogLevels.LOG
  if (level.toUpperCase() in LogLevels)
    return LogLevels[level.toUpperCase() as keyof typeof LogLevels]
  const num = Number.parseInt(level, 10)
  return Number.isNaN(num) ? LogLevels.LOG : num
}

export interface LoggerConfig {
  level?: string
  tag?: boolean
  date?: boolean
  format?: string
}

export class ConsoleService implements Logger {
  private readonly logger: ConsolaInstance

  constructor(config?: LoggerConfig) {
    // Env vars override config values (explicit false in config should override default)
    const levels = process.env.APP_LOGGER_LEVELS || config?.level
    const showTag = process.env.APP_LOGGER_TAG ? process.env.APP_LOGGER_TAG === 'true' : config?.tag
    const showDate = process.env.APP_LOGGER_DATE
      ? process.env.APP_LOGGER_DATE === 'true'
      : config?.date
    const format = process.env.APP_LOGGER_FORMAT || config?.format || 'pretty'

    const level = parseLogLevel(levels)

    if (format === 'json') {
      this.logger = createConsola({
        level,
        reporters: [
          {
            log: (logObj) => {
              process.stdout.write(`${JSON.stringify(logObj)}\n`)
            }
          }
        ]
      })
    } else {
      this.logger = createConsola({
        level,
        formatOptions: {
          date: showDate,
          colors: true
        }
      })

      if (showTag) {
        this.logger = this.logger.withTag('paw-tools')
      }
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args)
  }

  success(message: string, ...args: unknown[]): void {
    this.logger.success(message, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args)
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args)
  }

  start(message: string): void {
    this.logger.start(message)
  }

  done(message: string): void {
    this.logger.success(message)
  }

  fail(message: string): void {
    this.logger.fail(message)
  }

  log(message: string, ...args: unknown[]): void {
    this.logger.log(message, ...args)
  }
}
