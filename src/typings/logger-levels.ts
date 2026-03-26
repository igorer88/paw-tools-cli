import type { LogLevels } from '@/config/constants/logger.constants'

export type LogLevel = keyof typeof LogLevels
export type LogLevelValue = (typeof LogLevels)[LogLevel]
