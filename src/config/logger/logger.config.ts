import { LogLevels } from '@/config/constants/logger.constants'

type LogLevelName = keyof typeof LogLevels

const defaultLogLevel: LogLevelName = 'DEBUG'

function isValidLogLevel(level: string): level is LogLevelName {
  return level.toUpperCase() in LogLevels
}

function parseLogLevel(level: string | undefined): LogLevelName {
  if (!level) return defaultLogLevel

  // Try numeric
  const num = Number.parseInt(level, 10)
  if (!Number.isNaN(num)) {
    // If it's a number, map to valid range
    if (num >= 0 && num <= 6) {
      return (
        (Object.keys(LogLevels).find(
          (k) => LogLevels[k as LogLevelName] === num
        ) as LogLevelName) || defaultLogLevel
      )
    }
    return defaultLogLevel
  }

  // Try string name
  if (isValidLogLevel(level.toUpperCase())) {
    return level.toUpperCase() as LogLevelName
  }

  return defaultLogLevel
}

export const logLevel = parseLogLevel(process.env.APP_LOGGER_LEVELS)
