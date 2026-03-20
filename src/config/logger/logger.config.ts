import { LogLevel } from '@nestjs/common'

const defaultLogLevel: LogLevel[] = [
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
  'fatal'
]

export const logLevel =
  (process.env.API_LOGGER_LEVELS?.split(',') as LogLevel[]) || defaultLogLevel
