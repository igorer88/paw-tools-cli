import { type ConsolaInstance, createConsola } from 'consola'

import type { Logger } from './interfaces'

const LOG_LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  info: 4,
  success: 5,
  debug: 6,
  trace: 7,
  silent: Infinity
} as const

function parseLogLevel(level: string | undefined): number {
  if (!level) return 3
  if (level in LOG_LEVELS) return LOG_LEVELS[level as keyof typeof LOG_LEVELS]
  const num = Number.parseInt(level, 10)
  return Number.isNaN(num) ? 3 : num
}

export class ConsoleService implements Logger {
  private readonly logger: ConsolaInstance

  constructor() {
    const levels = process.env.APP_LOGGER_LEVELS
    const showTag = process.env.APP_LOGGER_TAG === 'true'
    const showDate = process.env.APP_LOGGER_DATE === 'true'
    const format = process.env.APP_LOGGER_FORMAT

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
